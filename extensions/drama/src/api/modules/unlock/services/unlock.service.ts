import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DataSource, In, MoreThan, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { ExtensionBillingService } from "@buildingai/extension-sdk";
import { Injectable, Logger } from "@nestjs/common";

import { Drama } from "../../../db/entities/drama.entity";
import { Episode } from "../../../db/entities/episode.entity";
import { UnlockRecord, UnlockType } from "../../../db/entities/unlock-record.entity";
import { User, UserSubscription } from "@buildingai/db/entities";

/**
 * Result of an unlock request
 */
export interface UnlockResult {
    alreadyUnlocked: boolean;
    coins: number;
    balance?: number;
}

/**
 * Idempotent unlock service.
 *
 * Money-safety relies on three layers:
 * 1. Fast path: read existing unlock record before charging.
 * 2. DB unique partial indexes (uq_unlock_episode / uq_unlock_whole) — a concurrent
 *    duplicate insert aborts the whole transaction BEFORE any deduction.
 * 3. The record insert and the balance deduction share one transaction; the
 *    platform deductUserPower uses SELECT ... FOR UPDATE on the user row.
 */
@Injectable()
export class UnlockService extends BaseService<UnlockRecord> {
    private readonly logger = new Logger(UnlockService.name);

    constructor(
        @InjectRepository(UnlockRecord)
        private readonly unlockRepository: Repository<UnlockRecord>,
        @InjectRepository(Drama)
        private readonly dramaRepository: Repository<Drama>,
        @InjectRepository(Episode)
        private readonly episodeRepository: Repository<Episode>,
        private readonly billingService: ExtensionBillingService,
        private readonly dataSource: DataSource,
    ) {
        super(unlockRepository);
    }

    /**
     * Unlock a single episode for a user
     */
    async unlockEpisode(userId: string, episodeId: string): Promise<UnlockResult> {
        const episode = await this.episodeRepository.findOne({
            where: { id: episodeId },
            relations: ["drama"],
        });
        if (!episode || episode.status !== "published") {
            throw HttpErrorFactory.notFound("剧集不存在或未发布");
        }

        const existing = await this.unlockRepository.findOne({
            where: { userId, episodeId },
        });
        if (existing) {
            return { alreadyUnlocked: true, coins: 0 };
        }

        // free episode or VIP: record without charging
        const isVip = await this.isUserVip(userId);
        const coins = episode.isFree || episode.coinPrice <= 0 || isVip ? 0 : episode.coinPrice;

        return this.createUnlock({
            userId,
            dramaId: episode.drama.id,
            episodeId,
            type: UnlockType.EPISODE,
            coins,
        });
    }

    /**
     * Unlock the whole drama (all current and future episodes)
     */
    async unlockWholeDrama(userId: string, dramaId: string): Promise<UnlockResult> {
        const drama = await this.dramaRepository.findOneBy({ id: dramaId });
        if (!drama) {
            throw HttpErrorFactory.notFound("剧目不存在");
        }
        if (drama.wholePrice <= 0) {
            throw HttpErrorFactory.badRequest("该剧不支持整剧解锁");
        }

        const existing = await this.unlockRepository.findOne({
            where: { userId, dramaId, type: UnlockType.WHOLE },
        });
        if (existing) {
            return { alreadyUnlocked: true, coins: 0 };
        }

        const isVip = await this.isUserVip(userId);
        const coins = isVip ? 0 : drama.wholePrice;

        return this.createUnlock({
            userId,
            dramaId,
            type: UnlockType.WHOLE,
            coins,
        });
    }

    /**
     * User's unlock state for a drama (used by the H5 player)
     */
    async getDramaUnlockState(userId: string, dramaId: string) {
        const records = await this.unlockRepository.find({
            where: { userId, dramaId },
            select: ["episodeId", "type"],
        });
        return {
            whole: records.some((r) => r.type === UnlockType.WHOLE),
            episodeIds: records
                .filter((r) => r.type === UnlockType.EPISODE && r.episodeId)
                .map((r) => r.episodeId as string),
        };
    }

    /**
     * Console: paged unlock records with drama titles
     */
    async listForConsole(query: {
        page?: number;
        pageSize?: number;
        userId?: string;
        dramaId?: string;
    }) {
        const qb = this.unlockRepository
            .createQueryBuilder("u")
            .leftJoinAndMapOne(
                "u.drama",
                Drama,
                "d",
                "d.id = u.dramaId",
            )
            .orderBy("u.createdAt", "DESC")
            .skip(((query.page ?? 1) - 1) * (query.pageSize ?? 20))
            .take(query.pageSize ?? 20);

        if (query.userId) {
            qb.andWhere("u.userId = :userId", { userId: query.userId });
        }
        if (query.dramaId) {
            qb.andWhere("u.dramaId = :dramaId", { dramaId: query.dramaId });
        }

        const [items, total] = await qb.getManyAndCount();

        const episodeIds = Array.from(
            new Set(
                items
                    .map((row) => row.episodeId)
                    .filter((id): id is string => Boolean(id)),
            ),
        );
        const userIds = Array.from(new Set(items.map((row) => row.userId)));
        const [episodes, users] = await Promise.all([
            episodeIds.length
                ? this.episodeRepository.find({
                      where: { id: In(episodeIds) },
                      select: ["id", "episodeNo", "coinPrice"],
                  })
                : [],
            userIds.length
                ? this.dataSource.getRepository(User).find({
                      where: { id: In(userIds) },
                      select: ["id", "nickname", "username"],
                  })
                : [],
        ]);
        const episodeMap = new Map(episodes.map((e) => [e.id, e]));
        const userMap = new Map(users.map((u) => [u.id, u]));

        return {
            items: items.map((row) => {
                const episode = row.episodeId ? episodeMap.get(row.episodeId) : undefined;
                const user = userMap.get(row.userId);
                return {
                    ...row,
                    dramaTitle: row.drama?.title ?? row.dramaId.slice(0, 8),
                    episodeNo: episode?.episodeNo ?? null,
                    originalPrice:
                        row.type === UnlockType.WHOLE
                            ? (row.drama?.wholePrice ?? 0)
                            : (episode?.coinPrice ?? 0),
                    userNickname:
                        user?.nickname || user?.username || row.userId.slice(0, 8),
                };
            }),
            total,
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20,
        };
    }

    /**
     * Console: unlock stats (today & total, per drama)
     */
    async stats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totals = await this.unlockRepository
            .createQueryBuilder("u")
            .select("COUNT(*)", "total")
            .addSelect("SUM(u.coins)", "coins")
            .addSelect(
                "SUM(CASE WHEN u.type = 'episode' THEN 1 ELSE 0 END)",
                "episodeOrders",
            )
            .addSelect("SUM(CASE WHEN u.type = 'whole' THEN 1 ELSE 0 END)", "wholeOrders")
            .getRawOne();

        const todayRow = await this.unlockRepository
            .createQueryBuilder("u")
            .select("COUNT(*)", "count")
            .addSelect("SUM(u.coins)", "coins")
            .where("u.createdAt >= :today", { today })
            .getRawOne();

        const topDramas = await this.unlockRepository
            .createQueryBuilder("u")
            .select("u.dramaId", "dramaId")
            .addSelect("COUNT(*)", "unlocks")
            .addSelect("SUM(u.coins)", "coins")
            .groupBy("u.dramaId")
            .orderBy("unlocks", "DESC")
            .limit(10)
            .getRawMany();

        const dramaIds = topDramas.map((t) => t.dramaId);
        const dramas = dramaIds.length
            ? await this.dramaRepository.find({ where: { id: In(dramaIds) } })
            : [];
        const titleMap = new Map(dramas.map((d) => [d.id, d.title]));

        return {
            totalOrders: Number(totals?.total ?? 0),
            episodeOrders: Number(totals?.episodeOrders ?? 0),
            wholeOrders: Number(totals?.wholeOrders ?? 0),
            totalCoins: Number(totals?.coins ?? 0),
            todayOrders: Number(todayRow?.count ?? 0),
            todayCoins: Number(todayRow?.coins ?? 0),
            todayUnlocks: Number(todayRow?.count ?? 0),
            topDramas: topDramas.map((t) => ({
                dramaId: t.dramaId,
                title: titleMap.get(t.dramaId) ?? t.dramaId,
                unlocks: Number(t.unlocks),
                coins: Number(t.coins ?? 0),
            })),
        };
    }

    /**
     * Single-transaction: insert record then deduct balance.
     * Inserting BEFORE deducting means an insufficient balance rollback also
     * removes the record, and a unique-violation aborts before any charge.
     */
    private async createUnlock(params: {
        userId: string;
        dramaId: string;
        episodeId?: string;
        type: UnlockType;
        coins: number;
    }): Promise<UnlockResult> {
        try {
            return await this.dataSource.transaction(async (em) => {
                const record = em.create(UnlockRecord, params);
                await em.insert(UnlockRecord, record).catch((err) => {
                    if (this.isUniqueViolation(err)) {
                        throw new AlreadyUnlockedError();
                    }
                    throw err;
                });

                if (params.coins > 0) {
                    await this.billingService.deductUserPower(
                        {
                            userId: params.userId,
                            amount: params.coins,
                            remark: `短剧解锁 ${params.type === UnlockType.WHOLE ? "整剧" : "单集"}`,
                        },
                        em,
                    );
                }
                return { alreadyUnlocked: false, coins: params.coins };
            });
        } catch (err) {
            if (err instanceof AlreadyUnlockedError) {
                return { alreadyUnlocked: true, coins: 0 };
            }
            this.logger.error(`unlock failed: ${err instanceof Error ? err.message : err}`);
            throw err;
        }
    }

    private async isUserVip(userId: string): Promise<boolean> {
        const repo = this.dataSource.getRepository(UserSubscription);
        const count = await repo.count({
            where: { userId, endTime: MoreThan(new Date()) },
        });
        return count > 0;
    }

    private isUniqueViolation(err: unknown): boolean {
        return Boolean(
            err &&
                typeof err === "object" &&
                "code" in err &&
                (err as { code?: string }).code === "23505",
        );
    }
}

/**
 * Internal marker: unique index rejected a duplicate unlock
 */
class AlreadyUnlockedError extends Error {
    constructor() {
        super("already unlocked");
    }
}
