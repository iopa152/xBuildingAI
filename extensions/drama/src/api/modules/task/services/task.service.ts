import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DataSource, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { ExtensionBillingService } from "@buildingai/extension-sdk";
import { OpsService } from "../../ops/services/ops.service";
import { Injectable, Logger } from "@nestjs/common";

import {
    CheckinRecord,
    TaskConfig,
    TaskRecord,
    TaskType,
} from "../../../db/entities/task-entities.entity";

/**
 * 7-day checkin reward cycle (coins per day 1..7)
 */
export const CHECKIN_REWARDS = [10, 20, 30, 40, 50, 80, 150];

/**
 * Check-in + task progress + reward claiming.
 * All coin grants go through the platform billing service (account log included).
 */
@Injectable()
export class TaskService extends BaseService<TaskConfig> {
    private readonly logger = new Logger(TaskService.name);

    constructor(
        @InjectRepository(CheckinRecord)
        private readonly checkinRepository: Repository<CheckinRecord>,
        @InjectRepository(TaskConfig)
        private readonly taskConfigRepository: Repository<TaskConfig>,
        @InjectRepository(TaskRecord)
        private readonly taskRecordRepository: Repository<TaskRecord>,
        private readonly billingService: ExtensionBillingService,
        private readonly opsService: OpsService,
        private readonly dataSource: DataSource,
    ) {
        super(taskConfigRepository);
    }

    // ---------------- checkin ----------------

    /**
     * Today's checkin state + calendar for the current 7-day cycle
     */
    async checkinStatus(userId: string) {
        const today = this.today();
        const cycle = await this.opsService.getCheckinConfig();

        const records = await this.checkinRepository.find({
            where: { userId },
            order: { checkinDate: "DESC" },
            take: 30,
        });
        const checkedToday = records.some((r) => r.checkinDate === today);

        // consecutive days ending today or yesterday
        const dateSet = new Set(records.map((r) => r.checkinDate));
        let consecutive = 0;
        const cursor = new Date(today + "T00:00:00Z");
        if (!checkedToday) {
            cursor.setUTCDate(cursor.getUTCDate() - 1);
        }
        while (dateSet.has(cursor.toISOString().slice(0, 10))) {
            consecutive += 1;
            cursor.setUTCDate(cursor.getUTCDate() - 1);
        }

        // position in the current cycle: total recent checkins modulo 7
        const cyclePosition = (records.length % 7) || (checkedToday ? 7 : 0);
        const nextDayNo = checkedToday
            ? (cyclePosition % 7) + 1
            : Math.max(1, cyclePosition + 1);

        return {
            checkedToday,
            consecutive,
            cyclePosition,
            rewards: cycle,
            todayReward: cycle[nextDayNo - 1],
            nextReward: cycle[(nextDayNo % 7)],
            recentDates: records.slice(0, 7).map((r) => r.checkinDate),
        };
    }

    /**
     * Do today's checkin; unique (userId, date) prevents double reward
     */
    async checkin(userId: string) {
        const today = this.today();
        const existing = await this.checkinRepository.findOneBy({ userId, checkinDate: today });
        if (existing) {
            throw HttpErrorFactory.badRequest("今日已签到");
        }

        const count = await this.checkinRepository.count({ where: { userId } });
        const dayNo = (count % 7) + 1;
        const cycleReward = await this.opsService.getCheckinConfig();
        const coins = cycleReward[dayNo - 1];

        return this.dataSource.transaction(async (em) => {
            const record = em.create(CheckinRecord, {
                userId,
                checkinDate: today,
                dayNo,
                coins,
            });
            await em.insert(CheckinRecord, record).catch((err) => {
                if ((err as { code?: string }).code === "23505") {
                    throw HttpErrorFactory.badRequest("今日已签到");
                }
                throw err;
            });
            await this.billingService.addUserPower(
                { userId, amount: coins, remark: `签到奖励 第${dayNo}天` },
                em,
            );
            return { dayNo, coins };
        });
    }

    // ---------------- tasks ----------------

    /**
     * Enabled task configs + current user's progress/claim state
     */
    async taskList(userId?: string) {
        const today = this.today();
        const configs = await this.taskConfigRepository.find({
            where: { status: true },
            order: { sort: "DESC" },
        });
        const codes = configs.map((c) => c.code);
        const records = userId && codes.length
            ? await this.taskRecordRepository
                  .createQueryBuilder("r")
                  .where("r.userId = :userId", { userId })
                  .andWhere("r.taskCode IN (:...codes)", { codes })
                  .andWhere(
                      "(r.progressDate IS NULL OR r.progressDate = :today)",
                      { today },
                  )
                  .getMany()
            : [];
        const recordMap = new Map(records.map((r) => [r.taskCode, r]));

        return configs.map((config) => {
            const record = recordMap.get(config.code);
            return {
                code: config.code,
                name: config.name,
                type: config.type,
                target: config.target,
                reward: config.reward,
                description: config.description,
                progress: record?.progress ?? 0,
                completed: Boolean(record?.completedAt),
                rewarded: Boolean(record?.rewardedAt),
            };
        });
    }

    /**
     * Internal: bump progress for a user's task (daily or once).
     * dedupeKey (e.g. episodeId) is stored in detail and skips repeat events.
     */
    async bumpProgress(userId: string, code: string, increment = 1, dedupeKey?: string) {
        const config = await this.taskConfigRepository.findOneBy({ code, status: true });
        if (!config) return;

        const dateValue = config.type === TaskType.DAILY ? this.today() : null;
        const record = await this.taskRecordRepository.findOne({
            where: { userId, taskCode: code, progressDate: dateValue as never },
        });

        if (!record) {
            const created = this.taskRecordRepository.create({
                userId,
                taskCode: code,
                progressDate: dateValue,
                progress: increment,
                detail: dedupeKey ? { episodeIds: [dedupeKey] } : undefined,
            });
            if (increment >= config.target) {
                created.completedAt = new Date();
            }
            await this.taskRecordRepository.insert(created).catch(() => undefined);
            return;
        }

        if (record.completedAt) return;

        if (dedupeKey) {
            const seen = record.detail?.episodeIds ?? [];
            if (seen.includes(dedupeKey)) return;
            seen.push(dedupeKey);
            const progress = record.progress + increment;
            await this.taskRecordRepository.update(
                { id: record.id },
                {
                    progress,
                    detail: { episodeIds: seen },
                    ...(progress >= config.target ? { completedAt: new Date() } : {}),
                },
            );
            return;
        }

        const progress = record.progress + increment;
        await this.taskRecordRepository.update(
            { id: record.id },
            {
                progress,
                ...(progress >= config.target ? { completedAt: new Date() } : {}),
            },
        );
    }

    /**
     * Claim a completed task reward; rewardedAt marks claim state
     */
    async claim(userId: string, code: string) {
        const config = await this.taskConfigRepository.findOneBy({ code, status: true });
        if (!config) {
            throw HttpErrorFactory.notFound("任务不存在");
        }
        const dateValue = config.type === TaskType.DAILY ? this.today() : null;
        const record = await this.taskRecordRepository.findOne({
            where: { userId, taskCode: code, progressDate: dateValue as never },
        });
        if (!record?.completedAt) {
            throw HttpErrorFactory.badRequest("任务尚未完成");
        }
        if (record.rewardedAt) {
            throw HttpErrorFactory.badRequest("奖励已领取");
        }

        return this.dataSource.transaction(async (em) => {
            const updated = await em
                .createQueryBuilder()
                .update(TaskRecord)
                .set({ rewardedAt: new Date() })
                .where("id = :id AND rewardedAt IS NULL", { id: record.id })
                .execute();
            if (!updated.affected) {
                throw HttpErrorFactory.badRequest("奖励已领取");
            }
            await this.billingService.addUserPower(
                { userId, amount: config.reward, remark: `任务奖励 ${config.name}` },
                em,
            );
            return { reward: config.reward };
        });
    }

    // ---------------- console ----------------

    async listConfigs() {
        return this.taskConfigRepository.find({ order: { sort: "DESC" } });
    }

    async createConfig(dto: Partial<TaskConfig>) {
        const existing = await this.taskConfigRepository.findOneBy({ code: dto.code });
        if (existing) {
            throw HttpErrorFactory.badRequest("任务编码已存在");
        }
        return this.taskConfigRepository.save(this.taskConfigRepository.create(dto));
    }

    async updateConfig(id: string, dto: Partial<TaskConfig>) {
        await this.taskConfigRepository.update({ id }, dto);
    }

    async deleteConfig(id: string) {
        await this.taskConfigRepository.delete({ id });
    }

    async listRecords(query: { page?: number; pageSize?: number; taskCode?: string }) {
        const [items, total] = await this.taskRecordRepository.findAndCount({
            where: query.taskCode ? { taskCode: query.taskCode } : {},
            order: { createdAt: "DESC" },
            skip: ((query.page ?? 1) - 1) * (query.pageSize ?? 20),
            take: query.pageSize ?? 20,
        });
        return { items, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 };
    }

    /**
     * Check-in records for the console
     */
    async listCheckins(query: { page?: number; pageSize?: number; userId?: string }) {
        const [items, total] = await this.checkinRepository.findAndCount({
            where: query.userId ? { userId: query.userId } : {},
            order: { createdAt: "DESC" },
            skip: ((query.page ?? 1) - 1) * (query.pageSize ?? 20),
            take: query.pageSize ?? 20,
        });
        return { items, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 };
    }

    private today(): string {
        return new Date().toISOString().slice(0, 10);
    }
}

/**
 * Internal helper used by watch/unlock modules to bump task progress.
 * Kept as a separate injectable so domain modules do not depend on console APIs.
 */
@Injectable()
export class TaskTriggerService {
    constructor(private readonly taskService: TaskService) {}

    async onWatched(userId: string, episodeId?: string) {
        await this.taskService
            .bumpProgress(userId, "daily_watch", 1, episodeId)
            .catch((err) => this.swallow(err));
    }

    async onLiked(userId: string) {
        await this.taskService
            .bumpProgress(userId, "daily_like")
            .catch((err) => this.swallow(err));
    }

    /**
     * Generic task bump used by other domain modules
     */
    async bump(code: string, userId: string) {
        await this.taskService
            .bumpProgress(userId, code, 1)
            .catch((err) => this.swallow(err));
    }

    private swallow(err: unknown) {
        // progress tracking must never break the main flow
        new Logger(TaskTriggerService.name).warn(
            `task progress bump failed: ${err instanceof Error ? err.message : err}`,
        );
    }
}
