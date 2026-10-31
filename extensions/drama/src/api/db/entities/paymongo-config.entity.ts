import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

/**
 * PayMongo channel configuration (single active row).
 * PayMongo serves Philippines H5 payments (GCash / Maya) in PHP.
 */
@ExtensionEntity()
export class PaymongoConfig {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * PayMongo secret key (sk_test_... / sk_live_...), Basic-auth credential
     */
    @Column({ type: "varchar", length: 200, comment: "Secret Key" })
    secretKey: string;

    /**
     * Webhook signing secret for the `paymongo-signature` header
     */
    @Column({ type: "varchar", length: 200, default: "", comment: "Webhook Signing Secret" })
    webhookSecret: string;

    @Column({ type: "boolean", default: false, comment: "是否启用" })
    enabled: boolean;

    @Column({ type: "varchar", length: 500, default: "/", comment: "支付成功跳转" })
    successUrl: string;

    @Column({ type: "varchar", length: 500, default: "/", comment: "支付取消跳转" })
    cancelUrl: string;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}
