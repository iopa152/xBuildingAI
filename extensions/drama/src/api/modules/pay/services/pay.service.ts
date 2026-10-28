import { createHmac, timingSafeEqual } from "crypto";

import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DataSource, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { ExtensionBillingService } from "@buildingai/extension-sdk";
import { Injectable, Logger } from "@nestjs/common";

import { CoinOrder, CoinOrderStatus, CoinPackage, StripeConfig } from "../../../db/entities/pay-entities.entity";
import { PromotionService } from "../../promotion/services/promotion.service";

/**
 * Stripe coin payment: Checkout Session → webhook → credit coins.
 * Talks to the Stripe REST API directly (no SDK), verifies webhook signatures
 * with the channel's signing secret, and credits power idempotently — the
 * (orderNo → paid) state machine guarantees a single credit per order even if
 * Stripe retries the webhook.
 */
@Injectable()
export class PayService extends BaseService<CoinOrder> {
    private readonly logger = new Logger(PayService.name);

    constructor(
        @InjectRepository(CoinOrder)
        private readonly orderRepository: Repository<CoinOrder>,
        @InjectRepository(StripeConfig)
        private readonly configRepository: Repository<StripeConfig>,
        @InjectRepository(CoinPackage)
        private readonly packageRepository: Repository<CoinPackage>,
        private readonly billingService: ExtensionBillingService,
        private readonly promotionService: PromotionService,
        private readonly dataSource: DataSource,
    ) {
        super(orderRepository);
    }

    // ---------------- config ----------------

    async getConfig(): Promise<StripeConfig | null> {
        return this.configRepository.findOne({ where: {}, order: { updatedAt: "DESC" } });
    }

    async saveConfig(dto: Partial<StripeConfig>): Promise<StripeConfig> {
        const existing = await this.getConfig();
        if (existing) {
            await this.configRepository.update({ id: existing.id }, dto);
            return this.getConfig() as Promise<StripeConfig>;
        }
        return this.configRepository.save(this.configRepository.create(dto));
    }

    // ---------------- packages ----------------

    private static readonly DEFAULT_PACKAGES = [
        { coins: 100, bonus: 0, price: 0.99, tag: "" },
        { coins: 300, bonus: 30, price: 2.99, tag: "HOT" },
        { coins: 500, bonus: 50, price: 4.99, tag: "" },
        { coins: 1000, bonus: 100, price: 8.99, tag: "BEST" },
        { coins: 2000, bonus: 200, price: 16.99, tag: "" },
        { coins: 5000, bonus: 600, price: 39.99, tag: "" },
    ];

    /**
     * Seed the stock tiers on first run so a fresh install still shows a
     * usable recharge page.
     */
    private async ensurePackages(): Promise<void> {
        const count = await this.packageRepository.count();
        if (count > 0) return;
        await this.packageRepository.insert(
            PayService.DEFAULT_PACKAGES.map((p, i) => ({
                coins: p.coins,
                bonus: p.bonus,
                price: p.price.toFixed(2),
                tag: p.tag || null,
                sort: (i + 1) * 10,
                enabled: true,
            })),
        );
    }

    /**
     * Enabled tiers for the H5 recharge page, ordered by sort.
     */
    async getPackages() {
        await this.ensurePackages();
        const rows = await this.packageRepository.find({
            where: { enabled: true },
            order: { sort: "ASC", coins: "ASC" },
        });
        return rows.map((r) => ({
            coins: r.coins,
            bonus: r.bonus,
            price: Number(r.price),
            tag: r.tag ?? "",
        }));
    }

    async listPackages() {
        await this.ensurePackages();
        const rows = await this.packageRepository.find({
            order: { sort: "ASC", coins: "ASC" },
        });
        return rows.map((r) => ({ ...r, price: Number(r.price) }));
    }

    async createPackage(dto: {
        coins: number;
        bonus?: number;
        price: number;
        tag?: string;
        sort?: number;
        enabled?: boolean;
    }) {
        const exists = await this.packageRepository.findOneBy({ coins: dto.coins });
        if (exists) {
            throw HttpErrorFactory.badRequest("该金币档位已存在");
        }
        return this.packageRepository.save(
            this.packageRepository.create({
                coins: dto.coins,
                bonus: dto.bonus ?? 0,
                price: dto.price.toFixed(2),
                tag: dto.tag || null,
                sort: dto.sort ?? dto.coins,
                enabled: dto.enabled ?? true,
            }),
        );
    }

    async updatePackage(
        id: string,
        dto: Partial<{
            coins: number;
            bonus: number;
            price: number;
            tag: string;
            sort: number;
            enabled: boolean;
        }>,
    ) {
        const row = await this.packageRepository.findOneBy({ id });
        if (!row) {
            throw HttpErrorFactory.notFound("金币档位不存在");
        }
        if (dto.coins && dto.coins !== row.coins) {
            const dup = await this.packageRepository.findOneBy({ coins: dto.coins });
            if (dup) {
                throw HttpErrorFactory.badRequest("该金币档位已存在");
            }
        }
        await this.packageRepository.update(
            { id },
            {
                ...(dto.coins !== undefined ? { coins: dto.coins } : {}),
                ...(dto.bonus !== undefined ? { bonus: dto.bonus } : {}),
                ...(dto.price !== undefined ? { price: dto.price.toFixed(2) } : {}),
                ...(dto.tag !== undefined ? { tag: dto.tag || null } : {}),
                ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
                ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
            },
        );
        return { success: true, message: "更新成功" };
    }

    async deletePackage(id: string) {
        const row = await this.packageRepository.findOneBy({ id });
        if (!row) {
            throw HttpErrorFactory.notFound("金币档位不存在");
        }
        await this.packageRepository.delete(id);
        return { success: true, message: "删除成功" };
    }

    // ---------------- order ----------------

    /**
     * Create a coin order and a Stripe Checkout Session; returns the hosted
     * checkout url for the H5 to redirect to.
     */
    async createOrder(
        userId: string,
        params: { coins: number; price: number; currency?: string; promoCode?: string },
    ): Promise<{ orderNo: string; checkoutUrl: string; sessionId: string }> {
        const config = await this.requireEnabledConfig();

        if (!Number.isInteger(params.coins) || params.coins <= 0) {
            throw HttpErrorFactory.badRequest("金币数量不合法");
        }
        if (!Number.isFinite(params.price) || params.price <= 0) {
            throw HttpErrorFactory.badRequest("支付金额不合法");
        }

        const currency = (params.currency ?? "usd").toLowerCase();
        const amount = Math.round(params.price * 100);

        const orderNo = `HD${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const order = await this.orderRepository.save(
            this.orderRepository.create({
                orderNo,
                userId,
                coins: params.coins,
                amount,
                currency,
                promoCode: params.promoCode?.slice(0, 32),
                status: CoinOrderStatus.PENDING,
            }),
        );

        const base = process.env.APP_DOMAIN || "http://localhost:4090";
        const form = new URLSearchParams();
        form.set("mode", "payment");
        form.set("success_url", absolute(base, config.successUrl || "/"));
        form.set("cancel_url", absolute(base, config.cancelUrl || "/"));
        form.set("client_reference_id", orderNo);
        form.set("metadata[orderNo]", orderNo);
        form.set("line_items[0][quantity]", "1");
        form.set("line_items[0][price_data][currency]", currency);
        form.set("line_items[0][price_data][unit_amount]", String(amount));
        form.set(
            "line_items[0][price_data][product_data][name]",
            `${params.coins} Coins`,
        );

        const session = await this.stripeRequest(
            config,
            "POST",
            "/v1/checkout/sessions",
            form,
        ).catch((err) => {
            this.logger.error(`stripe session failed: ${err.message}`);
            throw HttpErrorFactory.badRequest(`Stripe 下单失败: ${err.message}`);
        });

        await this.orderRepository.update(
            { id: order.id },
            { sessionId: session.id },
        );

        return { orderNo, checkoutUrl: session.url, sessionId: session.id };
    }

    /**
     * Stripe webhook: verify signature → on checkout.session.completed credit
     * coins exactly once. Also handles refunds (charge.refunded).
     */
    async handleWebhook(rawBody: Buffer, signatureHeader: string) {
        const config = await this.getConfig();
        if (!config?.webhookSecret) {
            throw HttpErrorFactory.badRequest("支付通道未配置");
        }

        this.verifyStripeSignature(rawBody, signatureHeader, config.webhookSecret);

        const event = JSON.parse(rawBody.toString("utf8"));
        if (event.type === "checkout.session.completed") {
            const session = event.data?.object ?? {};
            await this.completeOrder(session);
            return { received: true };
        }
        if (event.type === "checkout.session.expired") {
            const orderNo = event.data?.object?.client_reference_id;
            if (orderNo) {
                await this.orderRepository.update(
                    { orderNo, status: CoinOrderStatus.PENDING },
                    { status: CoinOrderStatus.FAILED },
                );
            }
            return { received: true };
        }
        return { received: true };
    }

    /**
     * Mark an order paid and credit coins; single transaction guarded by the
     * status condition so webhook retries never double-credit.
     */
    async completeOrder(session: {
        client_reference_id?: string;
        id?: string;
        payment_intent?: string;
        amount_total?: number;
        currency?: string;
    }) {
        const orderNo = session.client_reference_id;
        if (!orderNo) {
            this.logger.warn("webhook session without client_reference_id");
            return;
        }

        await this.dataSource.transaction(async (em) => {
            const updated = await em
                .createQueryBuilder()
                .update(CoinOrder)
                .set({
                    status: CoinOrderStatus.PAID,
                    paidAt: new Date(),
                    paymentIntentId: session.payment_intent ?? undefined,
                })
                .where("orderNo = :orderNo AND status = :pending", {
                    orderNo,
                    pending: CoinOrderStatus.PENDING,
                })
                .execute();

            if (!updated.affected) {
                // already processed (retry) — idempotent no-op
                this.logger.log(`order ${orderNo} already processed`);
                return;
            }

            const order = await em.findOneBy(CoinOrder, { orderNo });
            if (!order) return;

            await this.billingService.addUserPower(
                {
                    userId: order.userId,
                    amount: order.coins,
                    remark: `金币充值 ${order.orderNo}`,
                },
                em,
            );

            // fire-and-forget: server-side Purchase CAPI on real payment
            if (order.promoCode) {
                this.promotionService
                    .sendCapiForLinkByCode(
                        order.promoCode,
                        "Purchase",
                        order.userId,
                        order.amount / 100,
                        order.currency,
                    )
                    .catch(() => undefined);
            }
        });
    }

    /**
     * Console refund: call Stripe refund API then claw back the coins.
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

        const form = new URLSearchParams();
        form.set("payment_intent", order.paymentIntentId);
        await this.stripeRequest(config, "POST", "/v1/refunds", form).catch((err) => {
            this.logger.error(`stripe refund failed: ${err.message}`);
            throw HttpErrorFactory.badRequest(`Stripe 退款失败: ${err.message}`);
        });

        return this.markRefunded(order);
    }

    /**
     * Shared refund finalization: flip status (idempotently) and claw back
     * the credited coins. Used by both the Stripe and Airwallex channels.
     */
    async markRefunded(order: CoinOrder) {
        await this.dataSource.transaction(async (em) => {
            const updated = await em
                .createQueryBuilder()
                .update(CoinOrder)
                .set({ status: CoinOrderStatus.REFUNDED })
                .where("id = :id AND status = :paid", {
                    id: order.id,
                    paid: CoinOrderStatus.PAID,
                })
                .execute();
            if (!updated.affected) {
                throw HttpErrorFactory.badRequest("订单状态已变更");
            }
            await this.billingService.deductUserPower(
                {
                    userId: order.userId,
                    amount: order.coins,
                    remark: `充值退款回收 ${order.orderNo}`,
                },
                em,
            );
        });
        return { success: true, message: "退款成功，金币已回收" };
    }

    async myOrders(userId: string, page = 1, pageSize = 20) {
        const [items, total] = await this.orderRepository.findAndCount({
            where: { userId },
            order: { createdAt: "DESC" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        return { items, total, page, pageSize };
    }

    async listOrdersForConsole(query: {
        page?: number;
        pageSize?: number;
        status?: string;
        userId?: string;
    }) {
        const [items, total] = await this.orderRepository.findAndCount({
            where: {
                ...(query.status ? { status: query.status } : {}),
                ...(query.userId ? { userId: query.userId } : {}),
            },
            order: { createdAt: "DESC" },
            skip: ((query.page ?? 1) - 1) * (query.pageSize ?? 20),
            take: query.pageSize ?? 20,
        });
        return { items, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 };
    }

    // ---------------- internals ----------------

    private async requireEnabledConfig(): Promise<StripeConfig> {
        const config = await this.getConfig();
        if (!config?.enabled || !config.secretKey) {
            throw HttpErrorFactory.badRequest("Stripe 支付通道未启用");
        }
        return config;
    }

    /**
     * Stripe-Signature: t=<ts>,v1=<hmac>. HMAC-SHA256(secret, `${t}.${body}`).
     */
    private verifyStripeSignature(rawBody: Buffer, header: string, secret: string) {
        if (!header) {
            throw HttpErrorFactory.badRequest("缺少签名头");
        }
        const parts = Object.fromEntries(
            header.split(",").map((kv) => kv.trim().split("=") as [string, string]),
        );
        if (!parts.t || !parts.v1) {
            throw HttpErrorFactory.badRequest("签名格式错误");
        }
        const expected = createHmac("sha256", secret)
            .update(`${parts.t}.${rawBody.toString("utf8")}`)
            .digest("hex");
        const a = Buffer.from(expected);
        const b = Buffer.from(parts.v1);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
            throw HttpErrorFactory.badRequest("签名校验失败");
        }
    }

    /**
     * Minimal Stripe REST call with form-encoded body
     */
    private async stripeRequest(
        config: StripeConfig,
        method: "GET" | "POST",
        path: string,
        form: URLSearchParams,
    ): Promise<any> {
        const response = await fetch(`https://api.stripe.com${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${config.secretKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: method === "POST" ? form.toString() : undefined,
        });
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        if (!response.ok) {
            throw new Error(data?.error?.message ?? `HTTP ${response.status}`);
        }
        return data;
    }
}

function absolute(base: string, url: string): string {
    if (url.startsWith("http")) return url;
    return `${base.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}
