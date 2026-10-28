import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    Unique,
} from "typeorm";

import { Drama } from "./drama.entity";

/**
 * Episode publish status
 */
export enum EpisodeStatus {
    DRAFT = "draft",
    PUBLISHED = "published",
}

/**
 * One episode of a drama
 */
@ExtensionEntity()
@Unique(["drama", "episodeNo"])
export class Episode {
    /**
     * Episode ID (uuid)
     */
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * Owning drama
     */
    @ManyToOne(() => Drama, (drama) => drama.episodes, { onDelete: "CASCADE" })
    drama: Drama;

    /**
     * Episode number, 1-based
     */
    @Column({ type: "int", comment: "集数序号" })
    episodeNo: number;

    /**
     * Episode title (optional, defaults to "EP.n")
     */
    @Column({ length: 255, nullable: true, comment: "剧集标题" })
    title?: string;

    /**
     * Video url (VOD playback url)
     */
    @Column({ type: "varchar", length: 1000, comment: "视频地址" })
    videoUrl: string;

    /**
     * Duration in seconds
     */
    @Column({ type: "int", default: 0, comment: "时长(秒)" })
    duration: number;

    /**
     * Coins to unlock this single episode, 0 = free
     */
    @Column({ type: "int", default: 0, comment: "单集解锁价格(金币)" })
    coinPrice: number;

    /**
     * Free episode flag (e.g. first 3 eps free)
     */
    @Column({ type: "boolean", default: false, comment: "是否免费" })
    isFree: boolean;

    /**
     * Publish status
     */
    @Column({ type: "varchar", length: 20, default: EpisodeStatus.PUBLISHED, comment: "状态" })
    status: EpisodeStatus | string;

    /**
     * Like count (denormalized)
     */
    @Column({ type: "int", default: 0, comment: "点赞数" })
    likeCount: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}
