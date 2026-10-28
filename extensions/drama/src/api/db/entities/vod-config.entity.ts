import { ExtensionEntity } from "@buildingai/core/decorators";
import { Column, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * Cloud VOD configuration (single active row)
 */
@ExtensionEntity()
export class VodConfig {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * aliyun (reserved for future: tencent)
     */
    @Column({ type: "varchar", length: 20, default: "aliyun", comment: "服务商" })
    provider: string;

    @Column({ type: "varchar", length: 200, nullable: true, comment: "AccessKeyId" })
    accessKeyId?: string;

    @Column({ type: "varchar", length: 200, nullable: true, comment: "AccessKeySecret" })
    accessKeySecret?: string;

    @Column({ type: "varchar", length: 50, default: "cn-shanghai", comment: "区域" })
    region: string;

    @Column({ type: "boolean", default: false, comment: "是否启用" })
    enabled: boolean;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}
