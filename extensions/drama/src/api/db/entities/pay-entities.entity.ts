import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

/**
 * Stripe channel configuration (single active row)
 */
@ExtensionEntity()
export class StripeConfig {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * sk_live_... / sk_test_...
     */
    @Column({ type: "varchar", length: 200, comment: "Secret Key" })
    secretKey: string;

    /**
     * whsec_... for webhook signature verification
     */
    @Column({ type: "varchar", length: 200, comment: "Webhook Signing Secret" })
    webhookSecret: string;

    /**
     * pk_... handed to the H5 for Stripe.js (optional)
     */
    @Column({ type: "varchar", length: 200, nullable: true, comment: "Publishable Key" })
    publishableKey?: string;

    @Column({ type: "boolean", default: false, comment: "是否启用" })
    enabled: boolean;

    /**
     * Checkout return urls (absolute or path)
     */
    @Column({ type: "varchar", length: 500, default: "/", comment: "支付成功跳转" })
    successUrl: string;

    @Column({ type: "varchar", length: 500, default: "/", comment: "支付取消跳转" })
    cancelUrl: string;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

/**
 * Coin recharge tier shown on the H5 top-up page
 */
@ExtensionEntity()
export class CoinPackage {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 100, default: "", comment: "套餐名称" })
    name: string;

    @Column({ type: "int", comment: "金币数量" })
    coins: number;

    @Column({ type: "int", default: 0, comment: "赠送金币" })
    bonus: number;

    /**
     * Price in major currency units, e.g. 2.99
     */
    @Column({ type: "decimal", precision: 10, scale: 2, comment: "价格(USD)" })
    price: string;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true, comment: "原价(USD)，划线价" })
    originalPrice?: string;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true, comment: "菲律宾价格(PHP)" })
    phpPrice?: string;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true, comment: "菲律宾原价(PHP)" })
    phpOriginalPrice?: string;

    @Column({ type: "varchar", length: 16, nullable: true, comment: "角标(HOT/BEST)" })
    tag?: string;

    @Column({ type: "boolean", default: false, comment: "首充专享" })
    firstChargeExclusive: boolean;

    @Column({ type: "varchar", length: 120, nullable: true, comment: "iOS产品ID(App Store内购)" })
    iosProductId?: string;

    @Column({ type: "varchar", length: 120, nullable: true, comment: "Android产品ID(Google Play内购)" })
    androidProductId?: string;

    @Column({ type: "int", default: 0, comment: "排序(升序)" })
    sort: number;

    @Column({ type: "boolean", default: true, comment: "是否上架" })
    enabled: boolean;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

/**
 * Coin purchase order status
 */
export enum CoinOrderStatus {
    PENDING = "pending",
    PAID = "paid",
    FAILED = "failed",
    REFUNDED = "refunded",
}

/**
 * A coin recharge order paid via Stripe
 */
@ExtensionEntity()
@Index("uq_coin_order_no", ["orderNo"], { unique: true })
export class CoinOrder {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * HD + timestamp + random
     */
    @Column({ type: "varchar", length: 40, comment: "订单号" })
    orderNo: string;

    @Column({ type: "varchar", length: 20, default: "coin", comment: "订单类型(coin/vip)" })
    orderType: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "int", comment: "金币数" })
    coins: number;

    @Column({ type: "int", default: 0, comment: "VIP天数" })
    vipDays: number;

    /**
     * Paid amount in smallest currency unit (cents)
     */
    @Column({ type: "int", comment: "支付金额(分)" })
    amount: number;

    @Column({ type: "int", default: 0, comment: "菲律宾金额(分)" })
    phpAmount: number;

    @Column({ type: "varchar", length: 8, default: "usd", comment: "币种" })
    currency: string;

    /**
     * Purchase market: web / ios / android
     */
    @Column({ type: "varchar", length: 20, nullable: true, comment: "市场" })
    market?: string;

    @Column({ type: "varchar", length: 64, nullable: true, comment: "投手" })
    pitcher?: string;

    @Column({ type: "boolean", default: false, comment: "是否订阅(自动续费)" })
    subscriber: boolean;

    @Column({ type: "varchar", length: 20, default: CoinOrderStatus.PENDING, comment: "状态" })
    status: CoinOrderStatus | string;

    /**
     * Payment channel: stripe / airwallex
     */
    @Column({ type: "varchar", length: 20, default: "stripe", comment: "支付通道" })
    channel: string;

    /**
     * Stripe Checkout Session id
     */
    @Column({ type: "varchar", length: 120, nullable: true, comment: "Stripe会话ID" })
    sessionId?: string;

    /**
     * Stripe PaymentIntent id (from webhook)
     */
    @Column({ type: "varchar", length: 120, nullable: true, comment: "支付意图ID" })
    paymentIntentId?: string;

    /**
     * Promo code context at purchase time (for CAPI / LTV)
     */
    @Column({ type: "varchar", length: 32, nullable: true, comment: "推广码" })
    promoCode?: string;

    @Column({ type: "timestamptz", nullable: true, comment: "支付时间" })
    paidAt?: Date;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

/**
 * Duration type for VIP packages
 */
export enum VipDurationType {
    WEEK = "week",
    MONTH = "month",
    QUARTER = "quarter",
    YEAR = "year",
}

/**
 * VIP membership package shown on the H5 VIP page
 */
@ExtensionEntity()
export class VipPackage {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 100, comment: "套餐名称" })
    name: string;

    /**
     * week / month / quarter / year
     */
    @Column({ type: "varchar", length: 20, default: VipDurationType.MONTH, comment: "时长类型" })
    durationType: string;

    @Column({ type: "int", comment: "有效天数" })
    days: number;

    @Column({ type: "decimal", precision: 10, scale: 2, comment: "价格(USD)" })
    price: string;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true, comment: "原价(USD)" })
    originalPrice?: string;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true, comment: "菲律宾价格(PHP)" })
    phpPrice?: string;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true, comment: "菲律宾原价(PHP)" })
    phpOriginalPrice?: string;

    @Column({ type: "varchar", length: 16, nullable: true, comment: "标签" })
    tag?: string;

    @Column({ type: "int", default: 0, comment: "排序(升序)" })
    sort: number;

    @Column({ type: "boolean", default: false, comment: "自动续费" })
    autoRenew: boolean;

    @Column({ type: "boolean", default: true, comment: "是否上架" })
    enabled: boolean;

    @Column({ type: "varchar", length: 120, nullable: true, comment: "iOS订阅产品ID" })
    iosProductId?: string;

    @Column({ type: "varchar", length: 120, nullable: true, comment: "Android订阅产品ID" })
    androidProductId?: string;

    @Column({ type: "varchar", length: 120, nullable: true, comment: "Google Base Plan ID" })
    googleBasePlanId?: string;

    @Column({ type: "varchar", length: 120, nullable: true, comment: "Stripe价格ID(用于H5支付)" })
    stripePriceId?: string;

    @Column({ type: "varchar", length: 120, nullable: true, comment: "Airwallex价格ID(需为recurring Price)" })
    airwallexPriceId?: string;

    @Column({ type: "varchar", length: 120, nullable: true, comment: "PayPal Plan ID(P-开头)" })
    paypalPlanId?: string;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

/**
 * Redeem code (兑换码)
 */
@ExtensionEntity()
@Index("uq_redeem_code", ["code"], { unique: true })
export class RedeemCode {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 32, comment: "兑换码" })
    code: string;

    @Column({ type: "varchar", length: 40, default: "", comment: "批次号" })
    batchNo: string;

    @Column({ type: "varchar", length: 100, default: "", comment: "活动名称" })
    activityName: string;

    /**
     * coin / vip
     */
    @Column({ type: "varchar", length: 20, default: "coin", comment: "奖励类型" })
    rewardType: string;

    /**
     * coin: 金币数; vip: 天数
     */
    @Column({ type: "int", comment: "奖励值" })
    rewardValue: number;

    /**
     * 0 = unlimited
     */
    @Column({ type: "int", default: 1, comment: "最大使用次数(0=不限)" })
    maxUses: number;

    @Column({ type: "int", default: 0, comment: "已使用次数" })
    usedCount: number;

    @Column({ type: "timestamptz", nullable: true, comment: "过期时间" })
    expireAt?: Date;

    @Column({ type: "boolean", default: true, comment: "状态" })
    enabled: boolean;

    @Column({ type: "int", default: 0, comment: "权重" })
    weight: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

/**
 * Redeem record (兑换记录) — one row per successful redemption
 */
@ExtensionEntity()
@Index("idx_redeem_record_code", ["code"])
@Index("idx_redeem_record_user", ["userId"])
export class RedeemRecord {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 32, comment: "兑换码" })
    code: string;

    @Column({ type: "varchar", length: 100, default: "", comment: "活动名称" })
    activityName: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "varchar", length: 100, nullable: true, comment: "用户名" })
    username?: string;

    @Column({ type: "varchar", length: 100, nullable: true, comment: "昵称" })
    nickname?: string;

    @Column({ type: "varchar", length: 20, comment: "奖励类型" })
    rewardType: string;

    @Column({ type: "varchar", length: 200, comment: "奖励内容" })
    rewardContent: string;

    @Column({ type: "int", nullable: true, comment: "兑换前金币" })
    coinsBefore?: number;

    @Column({ type: "int", nullable: true, comment: "兑换后金币" })
    coinsAfter?: number;

    @Column({ type: "timestamptz", nullable: true, comment: "兑换前VIP到期" })
    vipExpireBefore?: Date;

    @Column({ type: "timestamptz", nullable: true, comment: "兑换后VIP到期" })
    vipExpireAfter?: Date;

    @CreateDateColumn({ comment: "兑换时间" })
    createdAt: Date;
}
