import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

/**
 * Airwallex channel configuration (single active row)
 */
@ExtensionEntity()
export class AirwallexConfig {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * Airwallex client id (whl_...)
     */
    @Column({ type: "varchar", length: 120, comment: "Client ID" })
    clientId: string;

    /**
     * API key
     */
    @Column({ type: "varchar", length: 200, comment: "API Key" })
    apiKey: string;

    /**
     * Webhook signing secret for x-signature verification
     */
    @Column({ type: "varchar", length: 200, comment: "Webhook Secret" })
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
