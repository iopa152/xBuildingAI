import { createHmac, timingSafeEqual } from "crypto";

import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DataSource, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";

import { AirwallexConfig } from "../../../db/entities/airwallex-config.entity";
import { CoinOrder, CoinOrderStatus } from "../../../db/entities/pay-entities.entity";
import { PayService } from "./pay.service";

const AWX_API = "https://api-demo.airwallex.com/api/v1";
const AWX_CHECKOUT = "https://checkout-demo.airwallex.com";

/**
 * Airwallex coin payment, mirroring the Stripe flow:
 * auth (cached token) → PaymentIntent → hosted standalone checkout redirect →
 * webhook (x-signature HMAC) → idempotent credit via PayService.completeOrder.
 */
@Injectable()
export class AirwallexService extends BaseService<AirwallexConfig> {
    private readonly logger = new Logger(AirwallexService.name);
    private tokenCache: { token: string; expiresAt: number } | null = null;

    constructor(
        @InjectRepository(AirwallexConfig)
        private readonly configRepository: Repository<AirwallexConfig>,
        @InjectRepository(CoinOrder)
        private readonly orderRepository: Repository<CoinOrder>,
        private readonly payService: PayService,
        private readonly dataSource: DataSource,
    ) {
        super(configRepository);
    }

    // ---------------- config ----------------

    async getConfig(): Promise<AirwallexConfig | null> {
        return this.configRepository.findOne({ where: {}, order: { updatedAt: "DESC" } });
    }

    async saveConfig(dto: Partial<AirwallexConfig>): Promise<AirwallexConfig> {
        const existing = await this.getConfig();
        if (existing) {
            await this.configRepository.update({ id: existing.id }, dto);
            return this.getConfig() as Promise<AirwallexConfig>;
        }
        return this.configRepository.save(this.configRepository.create(dto));
    }

    // ---------------- order ----------------

    /**
     * Create a coin order + Airwallex PaymentIntent, return the hosted
     * standalone checkout url.
     */
    async createOrder(
        userId: string,
        params: { coins: number; price: number; currency?: string; promoCode?: string },
    ): Promise<{ orderNo: string; checkoutUrl: string }> {
        const config = await this.requireEnabledConfig();
        const currency = (params.currency ?? "usd").toLowerCase();
        const amount = Math.round(params.price * 100);
        const orderNo = `HA${Date.now()}${Math.floor(Math.random() * 1000)}`;

        const order = await this.orderRepository.save(
            this.orderRepository.create({
                orderNo,
                userId,
                coins: params.coins,
                amount,
                currency,
                channel: "airwallex",
                promoCode: params.promoCode?.slice(0, 32),
                status: CoinOrderStatus.PENDING,
            }),
        );

        const token = await this.accessToken(config);
        const intent = await this.awxRequest(config, token, "POST", "/payment_intents", {
            request_id: orderNo,
            amount,
            currency,
            merchant_order_id: orderNo,
            order: { products: [{ code: "coins", name: `${params.coins} Coins`, quantity: 1 }] },
            metadata: { orderNo },
        }).catch((err) => {
            this.logger.error(`awx intent failed: ${err.message}`);
            throw HttpErrorFactory.badRequest(`Airwallex 下单失败: ${err.message}`);
        });

        await this.orderRepository.update(
            { id: order.id },
            { paymentIntentId: intent.id },
        );

        const checkoutUrl =
            `${AWX_CHECKOUT}/#/standalone?intent_id=${intent.id}` +
            `&client_secret=${encodeURIComponent(intent.client_secret)}` +
            `&successUrl=${encodeURIComponent(absolute(config.successUrl || "/"))}` +
            `&cancelUrl=${encodeURIComponent(absolute(config.cancelUrl || "/"))}`;

        return { orderNo, checkoutUrl };
    }

    // ---------------- webhook ----------------

    /**
     * Airwallex webhook: headers `timestamp` + `x-signature` where
     * signature = HMAC-SHA256(webhookSecret, `${timestamp}.${rawBody}`).
     */
    async handleWebhook(rawBody: Buffer, timestamp: string, signature: string) {
        const config = await this.getConfig();
        if (!config?.webhookSecret) {
            throw HttpErrorFactory.badRequest("支付通道未配置");
        }
        if (!timestamp || !signature) {
            throw HttpErrorFactory.badRequest("缺少签名头");
        }
        const expected = createHmac("sha256", config.webhookSecret)
            .update(`${timestamp}.${rawBody.toString("utf8")}`)
            .digest("hex");
        const a = Buffer.from(expected);
        const b = Buffer.from(signature);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
            throw HttpErrorFactory.badRequest("签名校验失败");
        }

        const event = JSON.parse(rawBody.toString("utf8"));
        const name = event?.name ?? event?.type;
        const data = event?.data?.object ?? {};

        if (name === "payment_intent.succeeded") {
            const orderNo = data.metadata?.orderNo ?? data.merchant_order_id;
            if (orderNo) {
                await this.payService.completeOrder({
                    client_reference_id: orderNo,
                    payment_intent: data.id,
                });
            }
        } else if (name === "payment_intent.cancelled" || name === "payment_intent.expired") {
            const orderNo = data.metadata?.orderNo ?? data.merchant_order_id;
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
     * Console refund via Airwallex refund API, then claw back coins.
     */
    async refund(orderId: string) {
        const config = await this.requireEnabledConfig();
        const order = await this.orderRepository.findOneBy({ id: orderId });
        if (!order) {
            throw HttpErrorFactory.notFound("订单不存在");
        }
        if (order.status !== CoinOrderStatus.PAID) {
            throw HttpErrorFactory.badRequest("仅已支付订单可退款");
        }
        if (!order.paymentIntentId) {
            throw HttpErrorFactory.badRequest("订单缺少支付意图，无法退款");
        }

        const token = await this.accessToken(config);
        await this.awxRequest(config, token, "POST", "/refunds", {
            payment_intent_id: order.paymentIntentId,
            amount: order.amount,
            currency: order.currency,
        }).catch((err) => {
            this.logger.error(`awx refund failed: ${err.message}`);
            throw HttpErrorFactory.badRequest(`Airwallex 退款失败: ${err.message}`);
        });

        return this.payService.markRefunded(order);
    }

    // ---------------- internals ----------------

    private async requireEnabledConfig(): Promise<AirwallexConfig> {
        const config = await this.getConfig();
        if (!config?.enabled || !config.clientId || !config.apiKey) {
            throw HttpErrorFactory.badRequest("Airwallex 支付通道未启用");
        }
        return config;
    }

    /**
     * Bearer token with 10-minute cache (Airwallex tokens last ~30 min)
     */
    private async accessToken(config: AirwallexConfig): Promise<string> {
        if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60_000) {
            return this.tokenCache.token;
        }
        const res = await fetch(`${AWX_API}/authentication/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_id: config.clientId, api_key: config.apiKey }),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data?.message ?? `auth HTTP ${res.status}`);
        }
        this.tokenCache = {
            token: data.token,
            expiresAt: Date.now() + 10 * 60 * 1000,
        };
        return data.token;
    }

    private async awxRequest(
        config: AirwallexConfig,
        token: string,
        method: "GET" | "POST",
        path: string,
        body?: Record<string, unknown>,
    ): Promise<any> {
        const response = await fetch(`${AWX_API}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
        });
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        if (!response.ok) {
            throw new Error(data?.message ?? data?.error?.message ?? `HTTP ${response.status}`);
        }
        return data;
    }
}

function absolute(url: string): string {
    if (url.startsWith("http")) return url;
    const base = process.env.APP_DOMAIN || "http://localhost:5173";
    return `${base.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}
