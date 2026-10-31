import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { DataSource, ILike, In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { Drama } from "../../../db/entities/drama.entity";
import { Episode } from "../../../db/entities/episode.entity";
import {
    Comment,
    CommentStatus,
    Rating,
} from "../../../db/entities/comment-entities.entity";
import {
    Favorite,
    LikeRecord,
    WatchHistory,
} from "../../../db/entities/watch-entities.entity";
import { TaskTriggerService } from "../../task/services/task.service";

/**
 * Watch-domain service: history / favorite / like / comment / rating
 */
@Injectable()
export class WatchService extends BaseService<WatchHistory> {
    constructor(
        @InjectRepository(WatchHistory)
        private readonly historyRepository: Repository<WatchHistory>,
        @InjectRepository(Favorite)
        private readonly favoriteRepository: Repository<Favorite>,
        @InjectRepository(LikeRecord)
        private readonly likeRepository: Repository<LikeRecord>,
        @InjectRepository(Comment)
        private readonly commentRepository: Repository<Comment>,
        @InjectRepository(Rating)
        private readonly ratingRepository: Repository<Rating>,
        @InjectRepository(Drama)
        private readonly dramaRepository: Repository<Drama>,
        @InjectRepository(Episode)
        private readonly episodeRepository: Repository<Episode>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly taskTrigger: TaskTriggerService,
        private readonly dataSource: DataSource,
    ) {
        super(historyRepository);
    }

    // ---------------- watch history ----------------

    /**
     * Report watching progress (upsert one row per user+drama)
     */
    async reportProgress(
        userId: string,
        dramaId: string,
        episodeId: string,
        progressSeconds: number,
    ) {
        const episode = await this.episodeRepository.findOneBy({ id: episodeId });
        if (!episode) {
            throw HttpErrorFactory.notFound("剧集不存在");
        }

        await this.historyRepository.upsert(
            {
                userId,
                dramaId,
                episodeId,
                episodeNo: episode.episodeNo,
                progressSeconds: Math.max(0, Math.floor(progressSeconds)),
                duration: episode.duration,
            },
            { conflictPaths: ["userId", "dramaId"] },
        );

        // daily task progress: deduped per episode
        await this.taskTrigger.onWatched(userId, episodeId);
    }

    /**
     * My watch history (drama cards, latest first)
     */
    async myHistory(userId: string, page = 1, pageSize = 20) {
        const [items, total] = await this.historyRepository.findAndCount({
            where: { userId },
            relations: ["drama"],
            order: { updatedAt: "DESC" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        return { items, total, page, pageSize };
    }

    async removeHistory(userId: string, dramaId: string) {
        await this.historyRepository.delete({ userId, dramaId });
    }

    // ---------------- favorite ----------------

    async toggleFavorite(userId: string, dramaId: string): Promise<{ favorited: boolean }> {
        const existing = await this.favoriteRepository.findOneBy({ userId, dramaId });
        if (existing) {
            await this.favoriteRepository.delete({ id: existing.id });
            await this.dramaRepository.decrement({ id: dramaId }, "favoriteCount", 1);
            return { favorited: false };
        }
        await this.favoriteRepository.insert({ userId, dramaId }).catch((err) => {
            if ((err as { code?: string }).code !== "23505") throw err;
        });
        await this.dramaRepository.increment({ id: dramaId }, "favoriteCount", 1);
        await this.taskTrigger.bump("first_favorite", userId).catch(() => undefined);
        return { favorited: true };
    }

    async myFavorites(userId: string, page = 1, pageSize = 20) {
        const [items, total] = await this.favoriteRepository.findAndCount({
            where: { userId },
            relations: ["drama"],
            order: { createdAt: "DESC" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        return { items, total, page, pageSize };
    }

    // ---------------- like ----------------

    async toggleLike(
        userId: string,
        targetType: "drama" | "episode",
        targetId: string,
    ): Promise<{ liked: boolean }> {
        const existing = await this.likeRepository.findOneBy({
            userId,
            targetType,
            targetId,
        });
        if (existing) {
            await this.likeRepository.delete({ id: existing.id });
            if (targetType === "drama") {
                await this.dramaRepository.decrement({ id: targetId }, "likeCount", 1);
            } else {
                await this.episodeRepository.decrement({ id: targetId }, "likeCount", 1);
            }
            return { liked: false };
        }
        await this.likeRepository.insert({ userId, targetType, targetId }).catch((err) => {
            if ((err as { code?: string }).code !== "23505") throw err;
        });
        if (targetType === "drama") {
            await this.dramaRepository.increment({ id: targetId }, "likeCount", 1);
        } else {
            await this.episodeRepository.increment({ id: targetId }, "likeCount", 1);
        }
        await this.taskTrigger.onLiked(userId);
        await this.taskTrigger.bump("first_like", userId).catch(() => undefined);
        return { liked: true };
    }

    // ---------------- comment ----------------

    async createComment(
        userId: string,
        dramaId: string,
        content: string,
        episodeId?: string,
        parentId?: string,
    ) {
        if (content?.trim().length < 1 || content.length > 1000) {
            throw HttpErrorFactory.badRequest("评论内容长度 1-1000");
        }
        if (parentId) {
            const parent = await this.commentRepository.findOneBy({ id: parentId });
            if (!parent) {
                throw HttpErrorFactory.badRequest("回复的评论不存在");
            }
        }
        const comment = this.commentRepository.create({
            userId,
            dramaId,
            episodeId,
            parentId,
            content: content.trim(),
            status: CommentStatus.APPROVED,
        });
        await this.taskTrigger.bump("first_comment", userId).catch(() => undefined);
        return this.commentRepository.save(comment);
    }

    /**
     * Public comment list of a drama (approved only, newest first)
     */
    async listComments(dramaId: string, page = 1, pageSize = 20) {
        const [items, total] = await this.commentRepository.findAndCount({
            where: { dramaId, status: CommentStatus.APPROVED },
            relations: ["user"],
            select: {
                user: { id: true, avatar: true, nickname: true },
            } as never,
            order: { createdAt: "DESC" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        return { items, total, page, pageSize };
    }

    // ---------------- rating ----------------

    /**
     * Upsert user rating then recompute drama aggregates
     */
    async rateDrama(userId: string, dramaId: string, stars: number) {
        if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
            throw HttpErrorFactory.badRequest("星级必须为 1-5");
        }
        await this.ratingRepository.upsert(
            { userId, dramaId, stars },
            { conflictPaths: ["userId", "dramaId"] },
        );
        await this.taskTrigger.bump("first_rating", userId).catch(() => undefined);
        return this.recomputeDramaRating(dramaId);
    }

    private async recomputeDramaRating(dramaId: string) {
        const raw = await this.ratingRepository
            .createQueryBuilder("r")
            .select("COUNT(*)", "count")
            .addSelect("AVG(r.stars)", "avg")
            .where("r.dramaId = :dramaId", { dramaId })
            .getRawOne();
        await this.dramaRepository.update(
            { id: dramaId },
            {
                ratingCount: Number(raw?.count ?? 0),
                ratingAvg: Number(Number(raw?.avg ?? 0).toFixed(1)),
            },
        );
        return { ratingCount: Number(raw?.count ?? 0), ratingAvg: Number(raw?.avg ?? 0) };
    }

    // ---------------- console ----------------

    async listCommentsForConsole(query: {
        page?: number;
        pageSize?: number;
        dramaId?: string;
        status?: string;
        keyword?: string;
    }) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const qb = this.commentRepository
            .createQueryBuilder("comment")
            .leftJoinAndSelect("comment.drama", "drama")
            .leftJoin("comment.user", "user")
            .addSelect(["user.id", "user.nickname", "user.username", "user.avatar"]);

        if (query.dramaId) {
            qb.andWhere("comment.dramaId = :dramaId", { dramaId: query.dramaId });
        }
        if (query.status) {
            qb.andWhere("comment.status = :status", { status: query.status });
        }
        const kw = query.keyword?.trim();
        if (kw) {
            qb.andWhere(
                "(comment.content ILIKE :kw OR user.nickname ILIKE :kw OR user.username ILIKE :kw OR drama.title ILIKE :kw)",
                { kw: `%${kw}%` },
            );
        }

        const [items, total] = await qb
            .orderBy("comment.createdAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        const commentIds = items.map((c) => c.id);
        const episodeIds = Array.from(
            new Set(items.map((c) => c.episodeId).filter((id): id is string => Boolean(id))),
        );
        const [episodes, replies] = await Promise.all([
            episodeIds.length
                ? this.episodeRepository.find({
                      where: { id: In(episodeIds) },
                      select: ["id", "episodeNo"],
                  })
                : [],
            commentIds.length
                ? this.commentRepository
                      .createQueryBuilder("reply")
                      .select("reply.parentId", "parentId")
                      .addSelect("COUNT(*)", "count")
                      .where("reply.parentId IN (:...commentIds)", { commentIds })
                      .groupBy("reply.parentId")
                      .getRawMany()
                : [],
        ]);
        const episodeMap = new Map(episodes.map((e) => [e.id, e.episodeNo]));
        const replyMap = new Map(
            (replies as { parentId: string; count: string }[]).map((r) => [
                r.parentId,
                Number(r.count),
            ]),
        );

        return {
            items: items.map((comment) => ({
                ...comment,
                dramaTitle: comment.drama?.title ?? comment.dramaId.slice(0, 8),
                userNickname:
                    comment.user?.nickname ||
                    comment.user?.username ||
                    comment.userId.slice(0, 8),
                userAvatar: comment.user?.avatar ?? null,
                episodeNo: comment.episodeId
                    ? (episodeMap.get(comment.episodeId) ?? null)
                    : null,
                replyCount: replyMap.get(comment.id) ?? 0,
            })),
            total,
            page,
            pageSize,
        };
    }

    async commentStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const raw = await this.commentRepository
            .createQueryBuilder("c")
            .select("COUNT(*)", "total")
            .addSelect("SUM(CASE WHEN c.status = 'pending' THEN 1 ELSE 0 END)", "pending")
            .addSelect("SUM(CASE WHEN c.status = 'approved' THEN 1 ELSE 0 END)", "approved")
            .addSelect("SUM(CASE WHEN c.status = 'rejected' THEN 1 ELSE 0 END)", "rejected")
            .addSelect("SUM(CASE WHEN c.createdAt >= :today THEN 1 ELSE 0 END)", "today")
            .setParameter("today", today)
            .getRawOne();
        return {
            total: Number(raw?.total ?? 0),
            pending: Number(raw?.pending ?? 0),
            approved: Number(raw?.approved ?? 0),
            rejected: Number(raw?.rejected ?? 0),
            today: Number(raw?.today ?? 0),
        };
    }

    async setCommentStatus(id: string, status: CommentStatus) {
        await this.commentRepository.update({ id }, { status });
    }

    async setCommentsStatus(ids: string[], status: CommentStatus) {
        if (!ids.length) return;
        await this.commentRepository.update({ id: In(ids) }, { status });
    }

    async deleteComment(id: string) {
        await this.commentRepository.delete({ id });
    }

    async deleteComments(ids: string[]) {
        if (!ids.length) return;
        await this.commentRepository.delete({ id: In(ids) });
    }

    async historyStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const raw = await this.historyRepository
            .createQueryBuilder("h")
            .select("COUNT(*)", "total")
            .addSelect("COALESCE(SUM(h.progressSeconds), 0)", "seconds")
            .addSelect(
                "SUM(CASE WHEN h.duration > 0 AND h.progressSeconds >= h.duration * 0.95 THEN 1 ELSE 0 END)",
                "completed",
            )
            .addSelect("SUM(CASE WHEN h.updatedAt >= :today THEN 1 ELSE 0 END)", "today")
            .setParameter("today", today)
            .getRawOne();
        return {
            total: Number(raw?.total ?? 0),
            totalHours: Math.round((Number(raw?.seconds ?? 0) / 3600) * 10) / 10,
            completed: Number(raw?.completed ?? 0),
            today: Number(raw?.today ?? 0),
            topDramas: await this.topDramasBy(this.historyRepository, "h"),
        };
    }

    async deleteHistoryRows(ids: string[]) {
        if (!ids.length) return;
        await this.historyRepository.delete({ id: In(ids) });
    }

    async favoriteStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const raw = await this.favoriteRepository
            .createQueryBuilder("f")
            .select("COUNT(*)", "total")
            .addSelect("SUM(CASE WHEN f.createdAt >= :today THEN 1 ELSE 0 END)", "today")
            .setParameter("today", today)
            .getRawOne();
        return {
            total: Number(raw?.total ?? 0),
            today: Number(raw?.today ?? 0),
            topDramas: await this.topDramasBy(this.favoriteRepository, "f"),
        };
    }

    private async topDramasBy(
        repository: Repository<{ dramaId: string }>,
        alias: string,
    ): Promise<{ dramaId: string; title: string; count: number }[]> {
        const rows = (await repository
            .createQueryBuilder(alias)
            .select(`${alias}.dramaId`, "dramaId")
            .addSelect("COUNT(*)", "count")
            .groupBy(`${alias}.dramaId`)
            .orderBy("count", "DESC")
            .limit(10)
            .getRawMany()) as { dramaId: string; count: string }[];
        if (!rows.length) return [];
        const dramas = await this.dramaRepository.find({
            where: { id: In(rows.map((r) => r.dramaId)) },
            select: ["id", "title"],
        });
        const titleMap = new Map(dramas.map((d) => [d.id, d.title]));
        return rows.map((r) => ({
            dramaId: r.dramaId,
            title: titleMap.get(r.dramaId) ?? r.dramaId.slice(0, 8),
            count: Number(r.count),
        }));
    }

    async deleteFavoriteRows(ids: string[]) {
        if (!ids.length) return;
        const rows = await this.favoriteRepository.find({
            where: { id: In(ids) },
            select: ["id", "dramaId"],
        });
        if (!rows.length) return;
        await this.favoriteRepository.delete({ id: In(ids) });
        const counts = new Map<string, number>();
        rows.forEach((row) => counts.set(row.dramaId, (counts.get(row.dramaId) ?? 0) + 1));
        await Promise.all(
            Array.from(counts.entries()).map(([dramaId, count]) =>
                this.dramaRepository.decrement({ id: dramaId }, "favoriteCount", count),
            ),
        );
    }

    async listRatingsForConsole(query: {
        page?: number;
        pageSize?: number;
        dramaId?: string;
        keyword?: string;
    }) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const qb = this.ratingRepository.createQueryBuilder("rating");
        if (query.dramaId) {
            qb.andWhere("rating.dramaId = :dramaId", { dramaId: query.dramaId });
        }
        await this.applyKeyword(qb, "rating", query.keyword);
        const [items, total] = await qb
            .orderBy("rating.createdAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();
        return { items, total, page, pageSize };
    }

    async listFavoritesForConsole(query: {
        page?: number;
        pageSize?: number;
        dramaId?: string;
        keyword?: string;
    }) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const qb = this.favoriteRepository.createQueryBuilder("favorite");
        if (query.dramaId) {
            qb.andWhere("favorite.dramaId = :dramaId", { dramaId: query.dramaId });
        }
        await this.applyKeyword(qb, "favorite", query.keyword);
        const [items, total] = await qb
            .orderBy("favorite.createdAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();
        return { items, total, page, pageSize };
    }

    async listHistoryForConsole(query: {
        page?: number;
        pageSize?: number;
        userId?: string;
        dramaId?: string;
        keyword?: string;
    }) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const qb = this.historyRepository
            .createQueryBuilder("history")
            .leftJoinAndSelect("history.drama", "drama");
        if (query.userId) {
            qb.andWhere("history.userId = :userId", { userId: query.userId });
        }
        if (query.dramaId) {
            qb.andWhere("history.dramaId = :dramaId", { dramaId: query.dramaId });
        }
        await this.applyKeyword(qb, "history", query.keyword);
        const [items, total] = await qb
            .orderBy("history.updatedAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();
        return { items, total, page, pageSize };
    }

    /**
     * Keyword matches either the viewer (nickname/username) or the drama title.
     */
    private async applyKeyword(
        qb: { andWhere: (sql: string, params?: Record<string, unknown>) => unknown },
        alias: string,
        keyword?: string,
    ) {
        const kw = keyword?.trim();
        if (!kw) return;
        const pattern = `%${kw}%`;
        const [users, dramas] = await Promise.all([
            this.userRepository.find({
                where: [{ nickname: ILike(pattern) }, { username: ILike(pattern) }],
                select: ["id"],
            }),
            this.dramaRepository.find({
                where: { title: ILike(pattern) },
                select: ["id"],
            }),
        ]);
        const userIds = users.map((u) => u.id);
        const dramaIds = dramas.map((d) => d.id);
        if (userIds.length && dramaIds.length) {
            qb.andWhere(`(${alias}.userId IN (:...keywordUserIds) OR ${alias}.dramaId IN (:...keywordDramaIds))`, {
                keywordUserIds: userIds,
                keywordDramaIds: dramaIds,
            });
        } else if (userIds.length) {
            qb.andWhere(`${alias}.userId IN (:...keywordUserIds)`, { keywordUserIds: userIds });
        } else if (dramaIds.length) {
            qb.andWhere(`${alias}.dramaId IN (:...keywordDramaIds)`, { keywordDramaIds: dramaIds });
        } else {
            qb.andWhere("1 = 0");
        }
    }

    /**
     * Attach drama titles to rows lacking relations (favorites/ratings console lists)
     */
    async attachDramaTitles<T extends { dramaId: string }>(
        rows: T[],
    ): Promise<(T & { dramaTitle: string; dramaCover?: string | null })[]> {
        const ids = Array.from(new Set(rows.map((r) => r.dramaId)));
        if (!ids.length) return [];
        const dramas = await this.dramaRepository.find({
            where: { id: In(ids) },
            select: ["id", "title", "coverVertical"],
        });
        const map = new Map(dramas.map((d) => [d.id, d]));
        return rows.map((r) => {
            const drama = map.get(r.dramaId);
            return {
                ...r,
                dramaTitle: drama?.title ?? r.dramaId,
                dramaCover: drama?.coverVertical ?? null,
            };
        });
    }

    /**
     * Attach viewer profile to interaction rows (console lists)
     */
    async attachUserProfiles<T extends { userId: string }>(
        rows: T[],
    ): Promise<(T & { userNickname: string; userAvatar?: string | null })[]> {
        const ids = Array.from(new Set(rows.map((r) => r.userId)));
        if (!ids.length) return [];
        const users = await this.userRepository.find({
            where: { id: In(ids) },
            select: ["id", "nickname", "username", "avatar"],
        });
        const map = new Map(users.map((u) => [u.id, u]));
        return rows.map((r) => {
            const user = map.get(r.userId);
            return {
                ...r,
                userNickname: user?.nickname || user?.username || r.userId.slice(0, 8),
                userAvatar: user?.avatar ?? null,
            };
        });
    }
}

// re-exported for DTO typing
export type { Drama };
