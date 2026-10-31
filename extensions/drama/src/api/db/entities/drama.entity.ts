import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    JoinTable,
    ManyToMany,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

import { DramaCategory } from "./drama-category.entity";
import { Episode } from "./episode.entity";

/**
 * Drama publish status
 */
export enum DramaStatus {
    DRAFT = "draft",
    PUBLISHED = "published",
    OFFLINE = "offline",
}

/**
 * Short drama (a whole show)
 */
@ExtensionEntity()
export class Drama {
    /**
     * Drama ID (uuid)
     */
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * Title (per language version is a separate row)
     */
    @Column({ length: 255, comment: "剧目标题" })
    title: string;

    /**
     * Subtitle (副标题)
     */
    @Column({ type: "varchar", length: 255, nullable: true, comment: "副标题" })
    subtitle?: string;

    /**
     * Synopsis
     */
    @Column({ type: "text", nullable: true, comment: "剧情简介" })
    description?: string;

    /**
     * Language code, e.g. en / zh / ja
     */
    @Column({ length: 16, default: "en", comment: "语言" })
    language: string;

    /**
     * Vertical cover image url
     */
    @Column({ type: "varchar", length: 500, nullable: true, comment: "竖版封面" })
    coverVertical?: string;

    /**
     * Horizontal cover image url
     */
    @Column({ type: "varchar", length: 500, nullable: true, comment: "横版封面" })
    coverHorizontal?: string;

    /**
     * Publish status: draft / published / offline
     */
    @Column({ type: "varchar", length: 20, default: DramaStatus.DRAFT, comment: "状态" })
    status: DramaStatus | string;

    /**
     * Finished airing (完结)
     */
    @Column({ type: "boolean", default: false, comment: "是否完结" })
    complete: boolean;

    /**
     * Featured / promoted on home (精选)
     */
    @Column({ type: "boolean", default: false, comment: "是否精选" })
    featured: boolean;

    /**
     * Content type: 1 live-action, 2 anime, 3 AI generated
     */
    @Column({ type: "int", default: 1, comment: "内容类型" })
    contentType: number;

    /**
     * Hot list flag (热门榜单)
     */
    @Column({ type: "boolean", default: false, comment: "热门榜单" })
    hot: boolean;

    /**
     * New release flag (新剧首发)
     */
    @Column({ type: "boolean", default: false, comment: "新剧首发" })
    isNew: boolean;

    /**
     * Rising list flag (飙升榜)
     */
    @Column({ type: "boolean", default: false, comment: "飙升榜" })
    rising: boolean;

    /**
     * VIP only flag (VIP专属)
     */
    @Column({ type: "boolean", default: false, comment: "VIP专属" })
    vipOnly: boolean;

    /**
     * Exclusive copyright flag (独家版权)
     */
    @Column({ type: "boolean", default: false, comment: "独家版权" })
    exclusive: boolean;

    /**
     * Coin price to unlock the whole drama, 0 = not sellable as whole
     */
    @Column({ type: "int", default: 0, comment: "整剧解锁价格(金币)" })
    wholePrice: number;

    /**
     * Episode count (denormalized, "共 X 集")
     */
    @Column({ type: "int", default: 0, comment: "剧集总数" })
    episodeCount: number;

    /**
     * Heat score for ranking (后台可调 + 前端行为累计)
     */
    @Column({ type: "int", default: 0, comment: "热度值" })
    heat: number;

    /**
     * View count
     */
    @Column({ type: "int", default: 0, comment: "播放量" })
    viewCount: number;

    /**
     * Like count
     */
    @Column({ type: "int", default: 0, comment: "点赞数" })
    likeCount: number;

    /**
     * Favorite count
     */
    @Column({ type: "int", default: 0, comment: "收藏数" })
    favoriteCount: number;

    /**
     * Average rating (1-5, one decimal), maintained by rating service
     */
    @Column({ type: "numeric", precision: 3, scale: 1, default: 0, comment: "平均评分" })
    ratingAvg: number;

    /**
     * Rating count
     */
    @Column({ type: "int", default: 0, comment: "评分数" })
    ratingCount: number;

    /**
     * Manual sort weight, larger first
     */
    @Column({ type: "int", default: 0, comment: "排序权重(大在前)" })
    sort: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;

    /**
     * Categories of this drama (many-to-many)
     */
    @ManyToMany(() => DramaCategory, (category) => category.dramas)
    @JoinTable({ name: "drama_category_map" })
    categories?: DramaCategory[];

    /**
     * Episodes of this drama
     */
    @OneToMany(() => Episode, (episode) => episode.drama)
    episodes?: Episode[];
}
