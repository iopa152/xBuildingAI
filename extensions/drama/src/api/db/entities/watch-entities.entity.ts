import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    Index,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

import { Drama } from "./drama.entity";

/**
 * Last-watched progress per (user, drama). One row per drama.
 */
@ExtensionEntity()
@Index("uq_watch_user_drama", ["userId", "dramaId"], { unique: true })
export class WatchHistory {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "uuid", comment: "剧目ID" })
    dramaId: string;

    @Column({ type: "uuid", comment: "最后观看剧集ID" })
    episodeId: string;

    @Column({ type: "int", default: 0, comment: "集数序号" })
    episodeNo: number;

    @Column({ type: "int", default: 0, comment: "播放进度(秒)" })
    progressSeconds: number;

    @Column({ type: "int", default: 0, comment: "剧集总时长(秒)" })
    duration: number;

    @ManyToOne(() => Drama, { onDelete: "CASCADE" })
    drama?: Drama;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

/**
 * User favorite drama
 */
@ExtensionEntity()
@Index("uq_favorite_user_drama", ["userId", "dramaId"], { unique: true })
export class Favorite {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "uuid", comment: "剧目ID" })
    dramaId: string;

    @ManyToOne(() => Drama, { onDelete: "CASCADE" })
    drama?: Drama;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}

/**
 * User like on a drama or an episode
 */
@ExtensionEntity()
@Index("uq_like_target", ["userId", "targetType", "targetId"], { unique: true })
export class LikeRecord {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    /**
     * drama / episode
     */
    @Column({ type: "varchar", length: 20, comment: "目标类型" })
    targetType: string;

    @Column({ type: "uuid", comment: "目标ID" })
    targetId: string;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}
