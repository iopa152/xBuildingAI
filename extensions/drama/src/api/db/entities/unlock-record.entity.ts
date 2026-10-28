import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    Index,
    PrimaryGeneratedColumn,
} from "typeorm";

/**
 * Unlock type
 */
export enum UnlockType {
    EPISODE = "episode",
    WHOLE = "whole",
}

/**
 * A user's paid unlock of an episode or a whole drama.
 * DB unique constraints are the idempotency guard against double charging:
 * - uq_unlock_episode on (user_id, episode_id)
 * - uq_unlock_whole on (user_id, drama_id) where type = 'whole'
 */
@ExtensionEntity()
@Index("uq_unlock_episode", ["userId", "episodeId"], { unique: true })
@Index("uq_unlock_whole", ["userId", "dramaId"], {
    unique: true,
    where: `type = 'whole'`,
})
export class UnlockRecord {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "uuid", comment: "剧目ID" })
    dramaId: string;

    /**
     * Null for whole-drama unlocks
     */
    @Column({ type: "uuid", nullable: true, comment: "剧集ID(整剧解锁为空)" })
    episodeId?: string;

    @Column({ type: "varchar", length: 20, comment: "解锁类型 episode/whole" })
    type: UnlockType | string;

    /**
     * Coins actually charged (0 for free / VIP)
     */
    @Column({ type: "int", default: 0, comment: "消耗金币" })
    coins: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}
