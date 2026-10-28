import { ExtensionEntity } from "@buildingai/core/decorators";
import { Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * Banner link target type
 */
export enum BannerLinkType {
    DRAMA = "drama",
    EXTERNAL = "external",
}

/**
 * Home banner
 */
@ExtensionEntity()
export class Banner {
    /**
     * Banner ID (uuid)
     */
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * Banner title (internal name)
     */
    @Column({ length: 100, comment: "轮播图标题" })
    title: string;

    /**
     * Image url
     */
    @Column({ type: "varchar", length: 500, comment: "图片地址" })
    image: string;

    /**
     * Link type: drama detail or external url
     */
    @Column({ type: "varchar", length: 20, default: BannerLinkType.DRAMA, comment: "跳转类型" })
    linkType: BannerLinkType | string;

    /**
     * Target drama id when linkType = drama
     */
    @Column({ type: "uuid", nullable: true, comment: "跳转剧目ID" })
    dramaId?: string;

    /**
     * External url when linkType = external
     */
    @Column({ type: "varchar", length: 1000, nullable: true, comment: "外部链接" })
    url?: string;

    /**
     * Sort order, larger first
     */
    @Column({ type: "int", default: 0, comment: "排序(大在前)" })
    sort: number;

    /**
     * Enabled or not
     */
    @Column({ type: "boolean", default: true, comment: "是否启用" })
    status: boolean;

    /**
     * Optional display window
     */
    @Column({ type: "timestamptz", nullable: true, comment: "开始时间" })
    startTime?: Date;

    @Column({ type: "timestamptz", nullable: true, comment: "结束时间" })
    endTime?: Date;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}
