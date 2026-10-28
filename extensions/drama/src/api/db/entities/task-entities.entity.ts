import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    Index,
    PrimaryGeneratedColumn,
} from "typeorm";

/**
 * Daily check-in (7-day cycle rewards)
 */
@ExtensionEntity()
@Index("uq_checkin_user_date", ["userId", "checkinDate"], { unique: true })
export class CheckinRecord {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    /**
     * Local date string YYYY-MM-DD
     */
    @Column({ type: "date", comment: "签到日期" })
    checkinDate: string;

    /**
     * Cycle day number 1-7
     */
    @Column({ type: "int", comment: "周期第几天(1-7)" })
    dayNo: number;

    @Column({ type: "int", comment: "发放金币" })
    coins: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}

/**
 * Task type
 */
export enum TaskType {
    DAILY = "daily",
    ONCE = "once",
}

/**
 * Configurable task definition
 */
@ExtensionEntity()
@Index("uq_task_code", ["code"], { unique: true })
export class TaskConfig {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * Stable code, e.g. daily_watch / daily_like / once_profile
     */
    @Column({ type: "varchar", length: 50, comment: "任务编码" })
    code: string;

    @Column({ type: "varchar", length: 100, comment: "任务名称" })
    name: string;

    @Column({ type: "varchar", length: 20, comment: "类型 daily/once" })
    type: TaskType | string;

    /**
     * Times the action must happen before completion
     */
    @Column({ type: "int", default: 1, comment: "完成所需次数" })
    target: number;

    @Column({ type: "int", default: 0, comment: "奖励金币" })
    reward: number;

    @Column({ type: "boolean", default: true, comment: "是否启用" })
    status: boolean;

    @Column({ type: "int", default: 0, comment: "排序" })
    sort: number;

    @Column({ type: "varchar", length: 255, nullable: true, comment: "说明" })
    description?: string;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}

/**
 * Per-user task progress. Partial unique indexes:
 * - daily: (user_id, task_code, progress_date) where progress_date is not null
 * - once:  (user_id, task_code) where progress_date is null
 */
@ExtensionEntity()
@Index("uq_task_daily", ["userId", "taskCode", "progressDate"], {
    unique: true,
    where: `progress_date IS NOT NULL`,
})
@Index("uq_task_once", ["userId", "taskCode"], {
    unique: true,
    where: `progress_date IS NULL`,
})
export class TaskRecord {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "varchar", length: 50, comment: "任务编码" })
    taskCode: string;

    /**
     * Local date YYYY-MM-DD for daily tasks, null for once tasks
     */
    @Column({ type: "date", nullable: true, comment: "进度日期(一次性任务为空)" })
    progressDate?: string;

    @Column({ type: "int", default: 0, comment: "当前进度" })
    progress: number;

    @Column({ type: "timestamptz", nullable: true, comment: "完成时间" })
    completedAt?: Date;

    /**
     * Reward claimed at; null = not claimed
     */
    @Column({ type: "timestamptz", nullable: true, comment: "领奖时间" })
    rewardedAt?: Date;

    /**
     * Dedupe details, e.g. { episodeIds: [...] } so repeating the same
     * episode does not inflate daily watch progress
     */
    @Column({ type: "jsonb", nullable: true, comment: "进度去重明细" })
    detail?: { episodeIds?: string[] };

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}
