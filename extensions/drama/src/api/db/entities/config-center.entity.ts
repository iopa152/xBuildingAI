import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

/**
 * Third-party service configuration, one row per (category, provider).
 * Generic storage for the 配置中心 hub: customer service, push, SMS,
 * email, OAuth, distribution, heat — VOD / payment keep their dedicated
 * tables and are only surfaced here.
 */
@ExtensionEntity()
@Index("uq_tp_config_category_provider", ["category", "provider"], { unique: true })
export class ThirdPartyConfig {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /** config card key: customer_service | push | sms | email | oauth | distribution | heat */
    @Column({ type: "varchar", length: 40, comment: "配置分类" })
    category: string;

    /** provider key within the category, e.g. whatsapp / smtp / google / rebate */
    @Column({ type: "varchar", length: 40, comment: "服务商" })
    provider: string;

    @Column({ type: "boolean", default: false, comment: "是否启用" })
    enabled: boolean;

    /** provider-specific fields (link / keys / weights ...) */
    @Column({ type: "jsonb", default: "{}", comment: "配置项" })
    config: Record<string, unknown>;

    @Column({ type: "varchar", length: 300, default: "", comment: "备注" })
    remark: string;

    /** "verified" flag set by the test-connection action */
    @Column({ type: "boolean", default: false, comment: "是否已通过测试连接" })
    verified: boolean;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}
