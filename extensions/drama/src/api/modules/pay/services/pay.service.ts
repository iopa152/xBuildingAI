import { createHmac, randomBytes, timingSafeEqual } from "crypto";

import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { MembershipLevels, User as UserEntity, UserSubscription } from "@buildingai/db/entities";
import { DataSource, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { ExtensionBillingService } from "@buildingai/extension-sdk";
import { Injectable, Logger } from "@nestjs/common";

import {
    CoinOrder,
    CoinOrderStatus,
    CoinPackage,
    RedeemCode,
    RedeemRecord,
    StripeConfig,
    VipDurationType,
    VipPackage,
} from "../../../db/entities/pay-entities.entity";
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
        { name: "新手礼包", coins: 100, bonus: 0, price: 0.99, tag: "" },
        { name: "热门套餐", coins: 300, bonus: 30, price: 2.99, tag: "HOT" },
        { name: "超值套餐", coins: 500, bonus: 50, price: 4.99, tag: "BEST" },
        { name: "畅看套餐", coins: 1000, bonus: 100, price: 8.99, tag: "" },
        { name: "尊享套餐", coins: 2000, bonus: 200, price: 16.99, tag: "" },
        { name: "至尊套餐", coins: 5000, bonus: 600, price: 39.99, tag: "" },
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
                name: p.name,
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
            phpPrice: r.phpPrice ? Number(r.phpPrice) : 0,
            tag: r.tag ?? "",
            firstChargeExclusive: r.firstChargeExclusive,
        }));
    }

    async listPackages() {
        await this.ensurePackages();
        const rows = await this.packageRepository.find({
            order: { sort: "ASC", coins: "ASC" },
        });
        return rows.map((r) => ({
            ...r,
            price: Number(r.price),
            originalPrice: r.originalPrice ? Number(r.originalPrice) : null,
            phpPrice: r.phpPrice ? Number(r.phpPrice) : null,
            phpOriginalPrice: r.phpOriginalPrice ? Number(r.phpOriginalPrice) : null,
        }));
    }

    async createPackage(dto: {
        name?: string;
        coins: number;
        bonus?: number;
        price: number;
        originalPrice?: number;
        phpPrice?: number;
        phpOriginalPrice?: number;
        tag?: string;
        firstChargeExclusive?: boolean;
        iosProductId?: string;
        androidProductId?: string;
        sort?: number;
        enabled?: boolean;
    }) {
        return this.packageRepository.save(
            this.packageRepository.create({
                name: dto.name?.trim() || "",
                coins: dto.coins,
                bonus: dto.bonus ?? 0,
                price: dto.price.toFixed(2),
                originalPrice: dto.originalPrice ? dto.originalPrice.toFixed(2) : null,
                phpPrice: dto.phpPrice ? dto.phpPrice.toFixed(2) : null,
                phpOriginalPrice: dto.phpOriginalPrice ? dto.phpOriginalPrice.toFixed(2) : null,
                tag: dto.tag || null,
                firstChargeExclusive: dto.firstChargeExclusive ?? false,
                iosProductId: dto.iosProductId?.trim() || null,
                androidProductId: dto.androidProductId?.trim() || null,
                sort: dto.sort ?? dto.coins,
                enabled: dto.enabled ?? true,
            }),
        );
    }

    async updatePackage(
        id: string,
        dto: Partial<{
            name: string;
            coins: number;
            bonus: number;
            price: number;
            originalPrice: number | null;
            phpPrice: number | null;
            phpOriginalPrice: number | null;
            tag: string;
            firstChargeExclusive: boolean;
            iosProductId: string;
            androidProductId: string;
            sort: number;
            enabled: boolean;
        }>,
    ) {
        const row = await this.packageRepository.findOneBy({ id });
        if (!row) {
            throw HttpErrorFactory.notFound("金币套餐不存在");
        }
        await this.packageRepository.update(
            { id },
            {
                ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
                ...(dto.coins !== undefined ? { coins: dto.coins } : {}),
                ...(dto.bonus !== undefined ? { bonus: dto.bonus } : {}),
                ...(dto.price !== undefined ? { price: dto.price.toFixed(2) } : {}),
                ...(dto.originalPrice !== undefined
                    ? { originalPrice: dto.originalPrice ? dto.originalPrice.toFixed(2) : null }
                    : {}),
                ...(dto.phpPrice !== undefined
                    ? { phpPrice: dto.phpPrice ? dto.phpPrice.toFixed(2) : null }
                    : {}),
                ...(dto.phpOriginalPrice !== undefined
                    ? {
                          phpOriginalPrice: dto.phpOriginalPrice
                              ? dto.phpOriginalPrice.toFixed(2)
                              : null,
                      }
                    : {}),
                ...(dto.tag !== undefined ? { tag: dto.tag || null } : {}),
                ...(dto.firstChargeExclusive !== undefined
                    ? { firstChargeExclusive: dto.firstChargeExclusive }
                    : {}),
                ...(dto.iosProductId !== undefined
                    ? { iosProductId: dto.iosProductId.trim() || null }
                    : {}),
                ...(dto.androidProductId !== undefined
                    ? { androidProductId: dto.androidProductId.trim() || null }
                    : {}),
                ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
                ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
            },
        );
        return { success: true, message: "更新成功" };
    }

    async deletePackage(id: string) {
        const row = await this.packageRepository.findOneBy({ id });
        if (!row) {
            throw HttpErrorFactory.notFound("金币套餐不存在");
        }
        await this.packageRepository.delete(id);
        return { success: true, message: "删除成功" };
    }

    // ---------------- vip packages ----------------

    private static readonly DEFAULT_VIP_PACKAGES = [
        { name: "周卡会员", durationType: "week", days: 7, price: 1.99, tag: "", sort: 10 },
        { name: "月卡会员", durationType: "month", days: 30, price: 4.99, tag: "", sort: 20 },
        { name: "季卡会员", durationType: "quarter", days: 90, price: 12.99, tag: "热门", sort: 30 },
        { name: "年卡会员", durationType: "year", days: 365, price: 39.99, tag: "超值", sort: 40 },
    ];

    private vipPackageRepository() {
        return this.dataSource.getRepository(VipPackage);
    }

    private async ensureVipPackages(): Promise<void> {
        const count = await this.vipPackageRepository().count();
        if (count > 0) return;
        await this.vipPackageRepository().insert(
            PayService.DEFAULT_VIP_PACKAGES.map((p) => ({
                name: p.name,
                durationType: p.durationType,
                days: p.days,
                price: p.price.toFixed(2),
                tag: p.tag || null,
                sort: p.sort,
                enabled: true,
            })),
        );
    }

    async listVipPackages() {
        await this.ensureVipPackages();
        const rows = await this.vipPackageRepository().find({ order: { sort: "ASC", days: "ASC" } });
        return rows.map((r) => ({
            ...r,
            price: Number(r.price),
            originalPrice: r.originalPrice ? Number(r.originalPrice) : null,
            phpPrice: r.phpPrice ? Number(r.phpPrice) : null,
            phpOriginalPrice: r.phpOriginalPrice ? Number(r.phpOriginalPrice) : null,
        }));
    }

    async createVipPackage(dto: Partial<VipPackage> & { price: number; days: number }) {
        return this.vipPackageRepository().save(
            this.vipPackageRepository().create({
                name: dto.name?.trim() || "",
                durationType: dto.durationType || VipDurationType.MONTH,
                days: dto.days,
                price: dto.price.toFixed(2),
                originalPrice: dto.originalPrice ? dto.originalPrice.toFixed(2) : null,
                phpPrice: dto.phpPrice ? dto.phpPrice.toFixed(2) : null,
                phpOriginalPrice: dto.phpOriginalPrice ? dto.phpOriginalPrice.toFixed(2) : null,
                tag: dto.tag || null,
                autoRenew: dto.autoRenew ?? false,
                iosProductId: dto.iosProductId?.trim() || null,
                androidProductId: dto.androidProductId?.trim() || null,
                googleBasePlanId: dto.googleBasePlanId?.trim() || null,
                stripePriceId: dto.stripePriceId?.trim() || null,
                airwallexPriceId: dto.airwallexPriceId?.trim() || null,
                paypalPlanId: dto.paypalPlanId?.trim() || null,
                sort: dto.sort ?? 0,
                enabled: dto.enabled ?? true,
            }),
        );
    }

    async updateVipPackage(id: string, dto: Partial<VipPackage>) {
        const repo = this.vipPackageRepository();
        const row = await repo.findOneBy({ id });
        if (!row) {
            throw HttpErrorFactory.notFound("VIP套餐不存在");
        }
        const patch: Partial<VipPackage> = {};
        const strFields = [
            "name",
            "durationType",
            "iosProductId",
            "androidProductId",
            "googleBasePlanId",
            "stripePriceId",
            "airwallexPriceId",
            "paypalPlanId",
        ] as const;
        for (const key of strFields) {
            if (dto[key] !== undefined) {
                patch[key] = (dto[key] as string).trim() || null;
            }
        }
        if (dto.days !== undefined) patch.days = dto.days;
        if (dto.price !== undefined) patch.price = dto.price.toFixed(2);
        if (dto.originalPrice !== undefined)
            patch.originalPrice = dto.originalPrice ? dto.originalPrice.toFixed(2) : null;
        if (dto.phpPrice !== undefined)
            patch.phpPrice = dto.phpPrice ? dto.phpPrice.toFixed(2) : null;
        if (dto.phpOriginalPrice !== undefined)
            patch.phpOriginalPrice = dto.phpOriginalPrice
                ? dto.phpOriginalPrice.toFixed(2)
                : null;
        if (dto.tag !== undefined) patch.tag = dto.tag || null;
        if (dto.autoRenew !== undefined) patch.autoRenew = dto.autoRenew;
        if (dto.sort !== undefined) patch.sort = dto.sort;
        if (dto.enabled !== undefined) patch.enabled = dto.enabled;
        await repo.update({ id }, patch);
        return { success: true, message: "更新成功" };
    }

    async deleteVipPackage(id: string) {
        const repo = this.vipPackageRepository();
        const row = await repo.findOneBy({ id });
        if (!row) {
            throw HttpErrorFactory.notFound("VIP套餐不存在");
        }
        await repo.delete(id);
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
        keyword?: string;
        id?: string;
        username?: string;
        orderType?: string;
        currency?: string;
        channel?: string;
        market?: string;
        promoCode?: string;
        pitcher?: string;
        subscriber?: string;
        createdFrom?: string;
        createdTo?: string;
        paidFrom?: string;
        paidTo?: string;
    }) {
        const qb = this.orderRepository
            .createQueryBuilder("o")
            .orderBy("o.createdAt", "DESC")
            .skip(((query.page ?? 1) - 1) * (query.pageSize ?? 20))
            .take(query.pageSize ?? 20);

        if (query.status) qb.andWhere("o.status = :status", { status: query.status });
        if (query.userId) qb.andWhere("o.userId = :userId", { userId: query.userId });
        if (query.orderType) qb.andWhere("o.orderType = :orderType", { orderType: query.orderType });
        if (query.currency) qb.andWhere("o.currency = :currency", { currency: query.currency });
        if (query.channel) qb.andWhere("o.channel = :channel", { channel: query.channel });
        if (query.market) qb.andWhere("o.market = :market", { market: query.market });
        if (query.promoCode)
            qb.andWhere("o.promoCode ILIKE :promo", { promo: `%${query.promoCode}%` });
        if (query.pitcher) qb.andWhere("o.pitcher ILIKE :pitcher", { pitcher: `%${query.pitcher}%` });
        if (query.subscriber === "yes") qb.andWhere("o.subscriber = true");
        if (query.subscriber === "no") qb.andWhere("o.subscriber = false");
        if (query.keyword) qb.andWhere("o.orderNo ILIKE :kw", { kw: `%${query.keyword}%` });
        if (query.id) qb.andWhere("o.id::text ILIKE :idKw", { idKw: `%${query.id}%` });
        if (query.username) {
            const users = await this.dataSource
                .getRepository(UserEntity)
                .find({ where: [{ username: query.username }, { nickname: query.username }] });
            const ids = users.map((u) => u.id);
            qb.andWhere(ids.length ? "o.userId IN (:...userIds)" : "o.userId = :noMatch", ids.length ? { userIds: ids } : { noMatch: "00000000-0000-0000-0000-000000000000" });
        }
        if (query.createdFrom) qb.andWhere("o.createdAt >= :createdFrom", { createdFrom: query.createdFrom });
        if (query.createdTo) qb.andWhere("o.createdAt <= :createdTo", { createdTo: `${query.createdTo} 23:59:59` });
        if (query.paidFrom) qb.andWhere("o.paidAt >= :paidFrom", { paidFrom: query.paidFrom });
        if (query.paidTo) qb.andWhere("o.paidAt <= :paidTo", { paidTo: `${query.paidTo} 23:59:59` });

        const [items, total] = await qb.getManyAndCount();

        const userIds = Array.from(new Set(items.map((o) => o.userId)));
        const userMap = new Map<string, { username: string; nickname: string }>();
        if (userIds.length) {
            const users = await this.dataSource
                .getRepository(UserEntity)
                .find({ where: userIds.map((id) => ({ id })) });
            for (const u of users) {
                userMap.set(u.id, { username: u.username, nickname: u.nickname });
            }
        }

        return {
            items: items.map((o) => ({
                ...o,
                username: userMap.get(o.userId)?.username ?? null,
                nickname: userMap.get(o.userId)?.nickname ?? null,
            })),
            total,
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20,
        };
    }

    // ---------------- redeem codes ----------------

    private redeemCodeRepository() {
        return this.dataSource.getRepository(RedeemCode);
    }

    private redeemRecordRepository() {
        return this.dataSource.getRepository(RedeemRecord);
    }

    async listRedeemCodes(query: {
        page?: number;
        pageSize?: number;
        keyword?: string;
        rewardType?: string;
        enabled?: string;
    }) {
        const qb = this.redeemCodeRepository()
            .createQueryBuilder("c")
            .orderBy("c.createdAt", "DESC")
            .skip(((query.page ?? 1) - 1) * (query.pageSize ?? 20))
            .take(query.pageSize ?? 20);
        if (query.keyword) {
            qb.andWhere("(c.code ILIKE :kw OR c.batchNo ILIKE :kw OR c.activityName ILIKE :kw)", {
                kw: `%${query.keyword}%`,
            });
        }
        if (query.rewardType) qb.andWhere("c.rewardType = :rewardType", { rewardType: query.rewardType });
        if (query.enabled === "yes") qb.andWhere("c.enabled = true");
        if (query.enabled === "no") qb.andWhere("c.enabled = false");
        const [items, total] = await qb.getManyAndCount();
        return {
            items: items.map((c) => ({ ...c, expireAt: c.expireAt ?? null })),
            total,
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20,
        };
    }

    async createRedeemCode(dto: {
        code: string;
        batchNo?: string;
        activityName?: string;
        rewardType: string;
        rewardValue: number;
        maxUses?: number;
        expireAt?: string;
        enabled?: boolean;
        weight?: number;
    }) {
        const code = dto.code.trim().toUpperCase();
        const exists = await this.redeemCodeRepository().findOneBy({ code });
        if (exists) {
            throw HttpErrorFactory.badRequest("兑换码已存在");
        }
        return this.redeemCodeRepository().save(
            this.redeemCodeRepository().create({
                code,
                batchNo: dto.batchNo?.trim() || "",
                activityName: dto.activityName?.trim() || "",
                rewardType: dto.rewardType,
                rewardValue: dto.rewardValue,
                maxUses: dto.maxUses ?? 1,
                expireAt: dto.expireAt ? new Date(dto.expireAt) : null,
                enabled: dto.enabled ?? true,
                weight: dto.weight ?? 0,
            }),
        );
    }

    async updateRedeemCode(
        id: string,
        dto: Partial<{
            code: string;
            batchNo: string;
            activityName: string;
            rewardType: string;
            rewardValue: number;
            maxUses: number;
            expireAt: string | null;
            enabled: boolean;
            weight: number;
        }>,
    ) {
        const repo = this.redeemCodeRepository();
        const row = await repo.findOneBy({ id });
        if (!row) {
            throw HttpErrorFactory.notFound("兑换码不存在");
        }
        const patch: Partial<RedeemCode> = {};
        if (dto.code !== undefined) patch.code = dto.code.trim().toUpperCase();
        if (dto.batchNo !== undefined) patch.batchNo = dto.batchNo.trim();
        if (dto.activityName !== undefined) patch.activityName = dto.activityName.trim();
        if (dto.rewardType !== undefined) patch.rewardType = dto.rewardType;
        if (dto.rewardValue !== undefined) patch.rewardValue = dto.rewardValue;
        if (dto.maxUses !== undefined) patch.maxUses = dto.maxUses;
        if (dto.expireAt !== undefined) patch.expireAt = dto.expireAt ? new Date(dto.expireAt) : null;
        if (dto.enabled !== undefined) patch.enabled = dto.enabled;
        if (dto.weight !== undefined) patch.weight = dto.weight;
        if (patch.code && patch.code !== row.code) {
            const dup = await repo.findOneBy({ code: patch.code });
            if (dup) {
                throw HttpErrorFactory.badRequest("兑换码已存在");
            }
        }
        await repo.update({ id }, patch);
        return { success: true, message: "更新成功" };
    }

    async deleteRedeemCode(id: string) {
        const repo = this.redeemCodeRepository();
        const row = await repo.findOneBy({ id });
        if (!row) {
            throw HttpErrorFactory.notFound("兑换码不存在");
        }
        await repo.delete(id);
        return { success: true, message: "删除成功" };
    }

    async batchGenerateRedeemCodes(dto: {
        count: number;
        activityName?: string;
        rewardType: string;
        rewardValue: number;
        maxUses?: number;
        expireAt?: string;
        weight?: number;
    }) {
        const repo = this.redeemCodeRepository();
        const batchNo = `B${Date.now().toString(36).toUpperCase()}`;
        const rows: Partial<RedeemCode>[] = [];
        for (let i = 0; i < dto.count; i++) {
            rows.push({
                code: randomBytes(5).toString("hex").toUpperCase().slice(0, 10),
                batchNo,
                activityName: dto.activityName?.trim() || "",
                rewardType: dto.rewardType,
                rewardValue: dto.rewardValue,
                maxUses: dto.maxUses ?? 1,
                expireAt: dto.expireAt ? new Date(dto.expireAt) : null,
                enabled: true,
                weight: dto.weight ?? 0,
            });
        }
        const saved = await repo.save(repo.create(rows));
        return { batchNo, count: Array.isArray(saved) ? saved.length : 1 };
    }

    async listRedeemRecords(query: {
        page?: number;
        pageSize?: number;
        keyword?: string;
        rewardType?: string;
    }) {
        const qb = this.redeemRecordRepository()
            .createQueryBuilder("r")
            .orderBy("r.createdAt", "DESC")
            .skip(((query.page ?? 1) - 1) * (query.pageSize ?? 20))
            .take(query.pageSize ?? 20);
        if (query.keyword) {
            qb.andWhere(
                "(r.code ILIKE :kw OR r.activityName ILIKE :kw OR r.username ILIKE :kw OR r.nickname ILIKE :kw)",
                { kw: `%${query.keyword}%` },
            );
        }
        if (query.rewardType)
            qb.andWhere("r.rewardType = :rewardType", { rewardType: query.rewardType });
        const [items, total] = await qb.getManyAndCount();
        return { items, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 };
    }

    /**
     * H5: user redeems a code. Coin codes credit power; VIP codes extend the
     * active subscription end time. Records both outcomes.
     */
    async redeem(userId: string, rawCode: string) {
        const code = rawCode.trim().toUpperCase();
        if (!code) {
            throw HttpErrorFactory.badRequest("请输入兑换码");
        }
        return this.dataSource.transaction(async (em) => {
            const codeRepo = em.getRepository(RedeemCode);
            const row = await codeRepo.findOne({ where: { code }, lock: { mode: "pessimistic_write" } });
            if (!row) {
                throw HttpErrorFactory.badRequest("兑换码不存在");
            }
            if (!row.enabled) {
                throw HttpErrorFactory.badRequest("兑换码已禁用");
            }
            if (row.expireAt && row.expireAt.getTime() < Date.now()) {
                throw HttpErrorFactory.badRequest("兑换码已过期");
            }
            if (row.maxUses > 0 && row.usedCount >= row.maxUses) {
                throw HttpErrorFactory.badRequest("兑换码使用次数已达上限");
            }

            const user = await em.findOneBy(UserEntity, { id: userId });
            if (!user) {
                throw HttpErrorFactory.notFound("用户不存在");
            }

            const record: Partial<RedeemRecord> = {
                code: row.code,
                activityName: row.activityName,
                userId,
                username: user.username,
                nickname: user.nickname,
                rewardType: row.rewardType,
                rewardContent: "",
            };

            if (row.rewardType === "vip") {
                const subRepo = em.getRepository(UserSubscription);
                const current = await subRepo.findOne({
                    where: { userId },
                    order: { endTime: "DESC" },
                });
                const base =
                    current && current.endTime.getTime() > Date.now() ? current.endTime : new Date();
                record.vipExpireBefore = current?.endTime ?? null;
                const after = new Date(base.getTime() + row.rewardValue * 24 * 3600 * 1000);
                record.vipExpireAfter = after;
                record.rewardContent = `VIP会员 ${row.rewardValue} 天`;
                if (current) {
                    await subRepo.update({ id: current.id }, { endTime: after });
                } else {
                    const level = await em.findOne(MembershipLevels, {
                        where: {},
                        order: { id: "ASC" },
                    });
                    await subRepo.save(
                        subRepo.create({
                            userId,
                            levelId: level?.id ?? "00000000-0000-0000-0000-000000000000",
                            startTime: new Date(),
                            endTime: after,
                        } as Partial<UserSubscription>),
                    );
                }
            } else {
                const before = user.power ?? 0;
                await this.billingService.addUserPower(
                    {
                        userId,
                        amount: row.rewardValue,
                        remark: `兑换码奖励 ${row.code}`,
                    },
                    em,
                );
                record.coinsBefore = before;
                record.coinsAfter = before + row.rewardValue;
                record.rewardContent = `金币 ${row.rewardValue}`;
            }

            await codeRepo.update({ id: row.id }, { usedCount: row.usedCount + 1 });
            await em.save(RedeemRecord, em.create(RedeemRecord, record));
            return {
                success: true,
                rewardType: row.rewardType,
                rewardContent: record.rewardContent,
            };
        });
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
