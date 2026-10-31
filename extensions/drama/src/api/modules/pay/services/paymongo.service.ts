import { createHmac, timingSafeEqual } from "crypto";

import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DataSource, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";

import { CoinOrder, CoinOrderStatus } from "../../../db/entities/pay-entities.entity";
import { PaymongoConfig } from "../../../db/entities/paymongo-config.entity";
import { PayService } from "./pay.service";

const PAYMONGO_API = "https://api.paymongo.com/v1";

/**
 * PayMongo coin payment (Philippines GCash / Maya, PHP), mirroring the
 * Stripe flow: Checkout Session (Basic auth) → hosted checkout redirect →
 * webhook (`paymongo-signature` HMAC) → idempotent credit via
 * PayService.completeOrder.
 */
@Injectable()
export class PaymongoService extends BaseService<PaymongoConfig> {
    private readonly logger = new Logger(PaymongoService.name);

    constructor(
        @InjectRepository(PaymongoConfig)
        private readonly configRepository: Repository<PaymongoConfig>,
        @InjectRepository(CoinOrder)
        private readonly orderRepository: Repository<CoinOrder>,
        private readonly payService: PayService,
        private readonly dataSource: DataSource,
    ) {
        super(configRepository);
    }

    // ---------------- config ----------------

    async getConfig(): Promise<PaymongoConfig | null> {
        return this.configRepository.findOne({ where: {}, order: { updatedAt: "DESC" } });
    }

    async saveConfig(dto: Partial<PaymongoConfig>): Promise<PaymongoConfig> {
        const existing = await this.getConfig();
        if (existing) {
            await this.configRepository.update({ id: existing.id }, dto);
            return this.getConfig() as Promise<PaymongoConfig>;
        }
        return this.configRepository.save(this.configRepository.create(dto));
    }

    // ---------------- order ----------------

    /**
     * Create a coin order + PayMongo Checkout Session (PHP centavos), return
     * the hosted checkout url.
     */
    async createOrder(
        userId: string,
        params: { coins: number; price: number; promoCode?: string },
    ): Promise<{ orderNo: string; checkoutUrl: string }> {
        const config = await this.requireEnabledConfig();

        if (!Number.isInteger(params.coins) || params.coins <= 0) {
            throw HttpErrorFactory.badRequest("金币数量不合法");
        }
        if (!Number.isFinite(params.price) || params.price <= 0) {
            throw HttpErrorFactory.badRequest("支付金额不合法");
        }

        // PHP centavos
        const amount = Math.round(params.price * 100);
        const orderNo = `HP${Date.now()}${Math.floor(Math.random() * 1000)}`;

        const order = await this.orderRepository.save(
            this.orderRepository.create({
                orderNo,
                userId,
                coins: params.coins,
                amount,
                currency: "php",
                channel: "paymongo",
                promoCode: params.promoCode?.slice(0, 32),
                status: CoinOrderStatus.PENDING,
            }),
        );

        const base = process.env.APP_DOMAIN || "http://localhost:4090";
        const session = await this.paymongoRequest(config, "POST", "/checkout_sessions", {
            data: {
                attributes: {
                    reference_number: orderNo,
                    line_items: [
                        {
                            name: `${params.coins} Coins`,
                            description: `HelloDrama ${params.coins} coins`,
                            currency: "PHP",
                            amount,
                            quantity: 1,
                        },
                    ],
                    payment_method_types: ["gcash", "maya", "grab_pay", "card", "paylater_grab"],
                    success_url: absolute(base, config.successUrl || "/"),
                    cancel_url: absolute(base, config.cancelUrl || "/"),
                },
            },
        }).catch((err) => {
            this.logger.error(`paymongo session failed: ${err.message}`);
            throw HttpErrorFactory.badRequest(`PayMongo 下单失败: ${err.message}`);
        });

        await this.orderRepository.update(
            { id: order.id },
            { sessionId: session?.data?.id },
        );

        const checkoutUrl =
            session?.data?.attributes?.checkout_url ?? session?.data?.attributes?.redirect?.checkout_url;
        if (!checkoutUrl) {
            throw HttpErrorFactory.badRequest("PayMongo 未返回收银台地址");
        }
        return { orderNo, checkoutUrl };
    }

    // ---------------- webhook ----------------

    /**
     * PayMongo webhook: `paymongo-signature: t=<unix>,te=<id>,v1=<hex>[,v1=<hex>...]`
     * HMAC-SHA256 over `${t}.${rawBody}` with the webhook secret.
     */
    async handleWebhook(rawBody: Buffer, signatureHeader: string) {
        const config = await this.getConfig();
        if (!config?.webhookSecret) {
            throw HttpErrorFactory.badRequest("支付通道未配置");
        }
        if (!signatureHeader) {
            throw HttpErrorFactory.badRequest("缺少签名头");
        }
        const parts = Object.fromEntries(
            signatureHeader
                .split(",")
                .map((kv) => kv.trim().split("=", 2))
                .filter((kv) => kv.length === 2),
        ) as { t?: string; v1?: string };
        const timestamp = parts.t;
        const signatures = (parts.v1 ?? "").split("v1=").filter(Boolean);
        if (!timestamp || signatures.length === 0) {
            throw HttpErrorFactory.badRequest("签名格式错误");
        }
        const expected = createHmac("sha256", config.webhookSecret)
            .update(`${timestamp}.${rawBody.toString("utf8")}`)
            .digest("hex");
        const ok = signatures.some((sig) => {
            const a = Buffer.from(expected);
            const b = Buffer.from(sig);
            return a.length === b.length && timingSafeEqual(a, b);
        });
        if (!ok) {
            throw HttpErrorFactory.badRequest("签名校验失败");
        }

        const event = JSON.parse(rawBody.toString("utf8"));
        const attrs = event?.data?.attributes ?? {};
        const type = attrs.type;
        const resource = attrs.data?.attributes ?? {};

        if (type === "payment.paid") {
            const orderNo =
                resource.metadata?.orderNo ??
                resource.reference_number ??
                (await this.lookupOrderNoBySession(config, resource.checkout_session_id));
            if (orderNo) {
                await this.payService.completeOrder({
                    client_reference_id: orderNo,
                    id: resource.checkout_session_id,
                    payment_intent: resource.data?.attributes?.payment_intent_id ?? resource.id,
                });
            }
        } else if (type === "payment.failed" || type === "checkout_session.expired") {
            const orderNo =
                resource.metadata?.orderNo ??
                resource.reference_number ??
                (await this.lookupOrderNoBySession(config, resource.checkout_session_id));
            if (orderNo) {
                await this.orderRepository.update(
                    { orderNo, status: CoinOrderStatus.PENDING },
                    { status: CoinOrderStatus.FAILED },
                );
            }
        }
        return { received: true };
    }

    /**
     * Payment objects don't echo metadata — resolve the order through the
     * checkout session's reference_number when the webhook payload lacks it.
     */
    private async lookupOrderNoBySession(
        config: PaymongoConfig,
        sessionId?: string,
    ): Promise<string | undefined> {
        if (!sessionId) return undefined;
        try {
            const session = await this.paymongoRequest(
                config,
                "GET",
                `/checkout_sessions/${sessionId}`,
            );
            return session?.data?.attributes?.reference_number ?? undefined;
        } catch (err) {
            this.logger.warn(`paymongo session lookup failed: ${(err as Error).message}`);
            return undefined;
        }
    }

    // ---------------- internals ----------------

    private async requireEnabledConfig(): Promise<PaymongoConfig> {
        const config = await this.getConfig();
        if (!config?.enabled || !config.secretKey) {
            throw HttpErrorFactory.badRequest("PayMongo 支付通道未启用");
        }
        return config;
    }

    private async paymongoRequest(
        config: PaymongoConfig,
        method: "GET" | "POST",
        path: string,
        body?: Record<string, unknown>,
    ): Promise<any> {
        const response = await fetch(`${PAYMONGO_API}${path}`, {
            method,
            headers: {
                Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`,
                "Content-Type": "application/json",
            },
            body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            const errors = (data as any)?.errors;
            const detail = Array.isArray(errors)
                ? errors.map((e: any) => e?.detail ?? e?.code).join("; ")
                : `HTTP ${response.status}`;
            throw new Error(detail);
        }
        return data;
    }
}

function absolute(base: string, path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
