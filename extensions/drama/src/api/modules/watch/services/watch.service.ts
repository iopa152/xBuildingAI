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
    }) {
        const [items, total] = await this.commentRepository.findAndCount({
            where: {
                ...(query.dramaId ? { dramaId: query.dramaId } : {}),
                ...(query.status ? { status: query.status } : {}),
            },
            relations: ["drama"],
            order: { createdAt: "DESC" },
            skip: ((query.page ?? 1) - 1) * (query.pageSize ?? 20),
            take: query.pageSize ?? 20,
        });
        return { items, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 };
    }

    async setCommentStatus(id: string, status: CommentStatus) {
        await this.commentRepository.update({ id }, { status });
    }

    async deleteComment(id: string) {
        await this.commentRepository.delete({ id });
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
    async attachDramaTitles<T extends { dramaId: string }>(rows: T[]): Promise<T[]> {
        const ids = Array.from(new Set(rows.map((r) => r.dramaId)));
        if (!ids.length) return rows;
        const dramas = await this.dramaRepository.find({
            where: { id: In(ids) },
            select: ["id", "title"],
        });
        const map = new Map(dramas.map((d) => [d.id, d.title]));
        return rows.map((r) => ({ ...r, dramaTitle: map.get(r.dramaId) ?? r.dramaId }));
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
