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
@Index("uq_coin_package_coins", ["coins"], { unique: true })
export class CoinPackage {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "int", comment: "金币数量" })
    coins: number;

    @Column({ type: "int", default: 0, comment: "赠送金币" })
    bonus: number;

    /**
     * Price in major currency units, e.g. 2.99
     */
    @Column({ type: "decimal", precision: 10, scale: 2, comment: "价格(USD)" })
    price: string;

    @Column({ type: "varchar", length: 16, nullable: true, comment: "角标(HOT/BEST)" })
    tag?: string;

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

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    /**
     * Coins to credit on success
     */
    @Column({ type: "int", comment: "金币数" })
    coins: number;

    /**
     * Paid amount in smallest currency unit (cents)
     */
    @Column({ type: "int", comment: "支付金额(分)" })
    amount: number;

    @Column({ type: "varchar", length: 8, default: "usd", comment: "币种" })
    currency: string;

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
