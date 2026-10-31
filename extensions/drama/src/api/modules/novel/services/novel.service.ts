import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DataSource, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { ExtensionBillingService } from "@buildingai/extension-sdk";
import { Injectable, Logger } from "@nestjs/common";

import {
    Novel,
    NovelBookshelf,
    NovelCategory,
    NovelChapter,
    NovelPurchase,
    NovelRating,
    NovelReadingHistory,
} from "../../../db/entities/novel-entities.entity";

type RecordType = "rating" | "bookshelf" | "history" | "purchase";

/**
 * Novel management + reader side. Chapter unlocks mirror the drama unlock
 * flow: single transaction (insert purchase record → deduct coins) guarded by
 * partial unique indexes, so concurrent/replayed requests never double-charge.
 */
@Injectable()
export class NovelService {
    private readonly logger = new Logger(NovelService.name);

    constructor(
        @InjectRepository(NovelCategory)
        private readonly categoryRepository: Repository<NovelCategory>,
        @InjectRepository(Novel)
        private readonly novelRepository: Repository<Novel>,
        @InjectRepository(NovelChapter)
        private readonly chapterRepository: Repository<NovelChapter>,
        @InjectRepository(NovelPurchase)
        private readonly purchaseRepository: Repository<NovelPurchase>,
        @InjectRepository(NovelRating)
        private readonly ratingRepository: Repository<NovelRating>,
        private readonly billingService: ExtensionBillingService,
        private readonly dataSource: DataSource,
    ) {}

    // ---------------- categories ----------------

    async listCategories() {
        return this.categoryRepository.find({ order: { sort: "DESC", createdAt: "ASC" } });
    }

    async createCategory(dto: Partial<NovelCategory>) {
        if (!dto.name?.trim()) throw HttpErrorFactory.badRequest("请填写分类名称");
        return this.categoryRepository.save(this.categoryRepository.create(dto));
    }

    async updateCategory(id: string, dto: Partial<NovelCategory>) {
        await this.categoryRepository.update({ id }, dto);
        return { success: true };
    }

    async deleteCategory(id: string) {
        const used = await this.novelRepository.count({ where: { categoryId: id } });
        if (used > 0) throw HttpErrorFactory.badRequest("该分类下仍有小说，无法删除");
        await this.categoryRepository.delete({ id });
        return { success: true };
    }

    // ---------------- novels ----------------

    async listNovels(query: {
        page?: number;
        pageSize?: number;
        keyword?: string;
        status?: string;
        categoryId?: string;
        priceType?: string;
    }) {
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.max(1, Math.min(Number(query.pageSize) || 20, 100));
        const where: string[] = ["1=1"];
        const params: unknown[] = [];
        if (query.keyword?.trim()) {
            params.push(`%${query.keyword.trim()}%`);
            where.push(`(n.title ILIKE $${params.length} OR n.author ILIKE $${params.length})`);
        }
        if (query.status === "0" || query.status === "1") {
            params.push(query.status === "1");
            where.push(`n.status = $${params.length}`);
        }
        if (query.categoryId) {
            params.push(query.categoryId);
            where.push(`n.category_id = $${params.length}`);
        }
        if (query.priceType) {
            params.push(query.priceType);
            where.push(`n.price_type = $${params.length}`);
        }
        const whereSql = where.join(" AND ");
        const rows = await this.dataSource.query(
            `SELECT n.*, c.name AS category_name
               FROM drama.novel n
               LEFT JOIN drama.novel_category c ON c.id = n.category_id
              WHERE ${whereSql}
              ORDER BY n.sort DESC, n.created_at DESC
              LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, pageSize, (page - 1) * pageSize],
        );
        const count = await this.dataSource.query(
            `SELECT COUNT(*)::int AS total FROM drama.novel n WHERE ${whereSql}`,
            params,
        );
        return {
            items: rows.map((r: Record<string, unknown>) => this.mapNovel(r)),
            total: count[0]?.total ?? 0,
            page,
            pageSize,
        };
    }

    private mapNovel(r: Record<string, unknown>) {
        return {
            id: r.id,
            title: r.title,
            author: r.author,
            cover: r.cover,
            categoryId: r.category_id,
            categoryName: r.category_name ?? "",
            description: r.description,
            tag: r.tag ?? "连载中",
            priceType: r.price_type ?? "free",
            coinPrice: Number(r.coin_price ?? 0),
            chapterCoinPrice: Number(r.chapter_coin_price ?? 0),
            chapterCount: Number(r.chapter_count ?? 0),
            wordCount: Number(r.word_count ?? 0),
            viewCount: Number(r.view_count ?? 0),
            saleCount: Number(r.sale_count ?? 0),
            ratingAvg: Number(r.rating_avg ?? 0),
            ratingCount: Number(r.rating_count ?? 0),
            status: r.status,
            sort: Number(r.sort),
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    }

    async createNovel(dto: Partial<Novel>) {
        if (!dto.title?.trim()) throw HttpErrorFactory.badRequest("请输入小说标题");
        return this.novelRepository.save(this.novelRepository.create(dto));
    }

    async updateNovel(id: string, dto: Partial<Novel>) {
        const patch: Partial<Novel> = { ...dto };
        // chapter/word counts are derived from the chapter table
        delete (patch as Record<string, unknown>).chapterCount;
        delete (patch as Record<string, unknown>).wordCount;
        await this.novelRepository.update({ id }, patch);
        return { success: true };
    }

    async deleteNovel(id: string) {
        await this.chapterRepository.delete({ novelId: id });
        await this.novelRepository.delete({ id });
        return { success: true };
    }

    // ---------------- chapters (console) ----------------

    async listChapters(novelId: string) {
        const rows = await this.chapterRepository.find({
            where: { novelId },
            order: { chapterNo: "ASC" },
        });
        return rows.map((r) => ({
            id: r.id,
            chapterNo: r.chapterNo,
            title: r.title,
            isFree: r.isFree,
            coinPrice: r.coinPrice,
            wordCount: r.wordCount,
            preview: (r.content ?? "").slice(0, 60),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        }));
    }

    async getChapter(id: string) {
        const chapter = await this.chapterRepository.findOneBy({ id });
        if (!chapter) throw HttpErrorFactory.notFound("章节不存在");
        return chapter;
    }

    async createChapter(dto: {
        novelId: string;
        chapterNo?: number;
        title: string;
        content?: string;
        isFree?: boolean;
        coinPrice?: number;
    }) {
        if (!dto.title?.trim()) throw HttpErrorFactory.badRequest("请填写章节标题");
        const novel = await this.novelRepository.findOneBy({ id: dto.novelId });
        if (!novel) throw HttpErrorFactory.notFound("小说不存在");

        const chapterNo =
            Number(dto.chapterNo) > 0 ? Number(dto.chapterNo) : await this.nextChapterNo(dto.novelId);
        const content = dto.content ?? "";

        try {
            const chapter = await this.chapterRepository.save(
                this.chapterRepository.create({
                    novelId: dto.novelId,
                    chapterNo,
                    title: dto.title.trim().slice(0, 128),
                    content,
                    isFree: dto.isFree ?? false,
                    coinPrice: Math.max(0, Number(dto.coinPrice) || 0),
                    wordCount: content.replace(/\s/g, "").length,
                }),
            );
            await this.refreshNovelStats(dto.novelId);
            return chapter;
        } catch (err) {
            if ((err as { code?: string }).code === "23505") {
                throw HttpErrorFactory.badRequest(`第 ${chapterNo} 章已存在`);
            }
            throw err;
        }
    }

    async updateChapter(
        id: string,
        dto: {
            chapterNo?: number;
            title?: string;
            content?: string;
            isFree?: boolean;
            coinPrice?: number;
        },
    ) {
        const existing = await this.chapterRepository.findOneBy({ id });
        if (!existing) throw HttpErrorFactory.notFound("章节不存在");
        const patch: Partial<NovelChapter> = {};
        if (dto.title !== undefined) patch.title = dto.title.trim().slice(0, 128);
        if (dto.isFree !== undefined) patch.isFree = dto.isFree;
        if (dto.coinPrice !== undefined) patch.coinPrice = Math.max(0, Number(dto.coinPrice) || 0);
        if (dto.chapterNo !== undefined && Number(dto.chapterNo) > 0) {
            patch.chapterNo = Number(dto.chapterNo);
        }
        if (dto.content !== undefined) {
            patch.content = dto.content;
            patch.wordCount = dto.content.replace(/\s/g, "").length;
        }
        try {
            await this.chapterRepository.update({ id }, patch);
        } catch (err) {
            if ((err as { code?: string }).code === "23505") {
                throw HttpErrorFactory.badRequest("章节号已存在");
            }
            throw err;
        }
        await this.refreshNovelStats(existing.novelId);
        return { success: true };
    }

    async deleteChapter(id: string) {
        const existing = await this.chapterRepository.findOneBy({ id });
        if (!existing) throw HttpErrorFactory.notFound("章节不存在");
        await this.chapterRepository.delete({ id });
        await this.refreshNovelStats(existing.novelId);
        return { success: true };
    }

    /**
     * Batch import from pasted text: blocks separated by a `===` / `---` line,
     * first line of each block is the chapter title.
     */
    async batchImportChapters(novelId: string, raw: string) {
        if (!raw?.trim()) throw HttpErrorFactory.badRequest("内容为空");
        const blocks = raw
            .split(/^\s*(?:===+|---+)\s*$/m)
            .map((b) => b.trim())
            .filter(Boolean);
        if (!blocks.length) throw HttpErrorFactory.badRequest("未解析到章节");

        let chapterNo = await this.nextChapterNo(novelId);
        let created = 0;
        for (const block of blocks) {
            const lines = block.split("\n");
            const title = (lines[0] ?? "").trim().slice(0, 128) || `第${chapterNo}章`;
            const content = lines.slice(1).join("\n").trim();
            await this.chapterRepository.insert(
                this.chapterRepository.create({
                    novelId,
                    chapterNo,
                    title,
                    content,
                    isFree: false,
                    coinPrice: 0,
                    wordCount: content.replace(/\s/g, "").length,
                }),
            );
            chapterNo += 1;
            created += 1;
        }
        await this.refreshNovelStats(novelId);
        return { created };
    }

    private async nextChapterNo(novelId: string): Promise<number> {
        const row = await this.chapterRepository
            .createQueryBuilder("c")
            .select("MAX(c.chapterNo)", "max")
            .where("c.novelId = :novelId", { novelId })
            .getRawOne<{ max: number | null }>();
        return Number(row?.max ?? 0) + 1;
    }

    /** keep chapterCount / wordCount in sync with the chapter table */
    async refreshNovelStats(novelId: string) {
        const agg = await this.chapterRepository
            .createQueryBuilder("c")
            .select("COUNT(*)", "cnt")
            .addSelect("COALESCE(SUM(c.wordCount),0)", "words")
            .where("c.novelId = :novelId", { novelId })
            .getRawOne<{ cnt: string; words: string }>();
        await this.novelRepository.update(
            { id: novelId },
            {
                chapterCount: Number(agg?.cnt ?? 0),
                wordCount: Number(agg?.words ?? 0),
            },
        );
    }

    // ---------------- records (console) ----------------

    async listRecords(
        type: RecordType,
        query: { page?: number; pageSize?: number; keyword?: string },
    ) {
        if (!["rating", "bookshelf", "history", "purchase"].includes(type)) {
            throw HttpErrorFactory.badRequest("记录类型不合法");
        }
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.max(1, Math.min(Number(query.pageSize) || 20, 100));
        const keyword = query.keyword?.trim();
        const params: unknown[] = [];
        let whereSql = "1=1";
        if (keyword) {
            params.push(`%${keyword}%`);
            whereSql = `(n.title ILIKE $1 OR u.username ILIKE $1 OR u.nickname ILIKE $1)`;
        }

        const base: Record<RecordType, string> = {
            rating: `SELECT r.id, r.score, r.created_at, n.title AS novel_title, u.username, u.nickname
                       FROM drama.novel_rating r
                       LEFT JOIN drama.novel n ON n.id = r.novel_id
                       LEFT JOIN "user" u ON u.id = r.user_id`,
            bookshelf: `SELECT b.id, b.created_at, n.title AS novel_title, u.username, u.nickname
                          FROM drama.novel_bookshelf b
                          LEFT JOIN drama.novel n ON n.id = b.novel_id
                          LEFT JOIN "user" u ON u.id = b.user_id`,
            history: `SELECT h.id, h.chapter, h.updated_at, n.title AS novel_title, u.username, u.nickname
                        FROM drama.novel_reading_history h
                        LEFT JOIN drama.novel n ON n.id = h.novel_id
                        LEFT JOIN "user" u ON u.id = h.user_id`,
            purchase: `SELECT p.id, p.coins, p.created_at, p.chapter_id, n.title AS novel_title,
                              u.username, u.nickname, c.title AS chapter_title
                         FROM drama.novel_purchase p
                         LEFT JOIN drama.novel n ON n.id = p.novel_id
                         LEFT JOIN drama.novel_chapter c ON c.id = p.chapter_id
                         LEFT JOIN "user" u ON u.id = p.user_id`,
        };
        const orderBy = type === "history" ? "h.updated_at DESC" : "created_at DESC";
        const rows = await this.dataSource.query(
            `${base[type]} WHERE ${whereSql} ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, pageSize, (page - 1) * pageSize],
        );
        const count = await this.dataSource.query(
            `SELECT COUNT(*)::int AS total FROM (${base[type]} WHERE ${whereSql}) t`,
            params,
        );
        return {
            items: rows.map((r: Record<string, unknown>) => ({
                id: r.id,
                novelTitle: r.novel_title ?? "",
                chapterTitle: r.chapter_title ?? null,
                isWholeBook: type === "purchase" ? !r.chapter_id : undefined,
                username: r.username ?? "",
                nickname: r.nickname ?? "",
                score: r.score ?? null,
                chapter: r.chapter ?? null,
                coins: r.coins ?? null,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
            })),
            total: count[0]?.total ?? 0,
            page,
            pageSize,
        };
    }

    async deleteRecord(type: RecordType, id: string) {
        const map = {
            rating: this.ratingRepository,
            bookshelf: this.dataSource.getRepository(NovelBookshelf),
            history: this.dataSource.getRepository(NovelReadingHistory),
            purchase: this.purchaseRepository,
        } as const;
        const repo = map[type];
        if (!repo) throw HttpErrorFactory.badRequest("记录类型不合法");
        await repo.delete({ id });
        return { success: true };
    }

    /** rating roll-up after a rating row is removed */
    async refreshRatingStats(novelId: string) {
        const row = await this.ratingRepository
            .createQueryBuilder("r")
            .select("COUNT(*)", "cnt")
            .addSelect("COALESCE(AVG(r.score),0)", "avg")
            .where("r.novelId = :novelId", { novelId })
            .getRawOne<{ cnt: string; avg: string }>();
        await this.novelRepository.update(
            { id: novelId },
            {
                ratingCount: Number(row?.cnt ?? 0),
                ratingAvg: Math.round(Number(row?.avg ?? 0) * 10) / 10,
            },
        );
    }

    // ---------------- reader side (web) ----------------

    async readerList(query: {
        page?: number;
        pageSize?: number;
        categoryId?: string;
        keyword?: string;
    }) {
        const res = await this.listNovels({ ...query, status: "1" });
        return {
            items: res.items.map((n) => ({
                id: n.id,
                title: n.title,
                author: n.author,
                cover: n.cover,
                description: n.description,
                tag: n.tag,
                priceType: n.priceType,
                coinPrice: n.coinPrice,
                chapterCount: n.chapterCount,
                viewCount: n.viewCount,
                ratingAvg: n.ratingAvg,
                categoryName: n.categoryName,
            })),
            total: res.total,
            page: res.page,
            pageSize: res.pageSize,
        };
    }

    /** novel detail + chapter list + this user's unlock state */
    async readerDetail(novelId: string, userId?: string) {
        const novel = await this.novelRepository.findOneBy({ id: novelId, status: true });
        if (!novel) throw HttpErrorFactory.notFound("小说不存在或已下架");
        await this.novelRepository.increment({ id: novelId }, "viewCount", 1);

        const chapters = await this.chapterRepository.find({
            where: { novelId },
            order: { chapterNo: "ASC" },
        });
        const owned = userId ? await this.ownedChapterIds(userId, novelId) : new Set<string>();
        const freeNovel = this.isNovelFree(novel);

        return {
            novel: {
                id: novel.id,
                title: novel.title,
                author: novel.author,
                cover: novel.cover,
                description: novel.description,
                tag: novel.tag,
                priceType: novel.priceType,
                coinPrice: novel.coinPrice,
                chapterCoinPrice: novel.chapterCoinPrice,
                chapterCount: chapters.length,
                wordCount: novel.wordCount,
                ratingAvg: Number(novel.ratingAvg ?? 0),
                ratingCount: novel.ratingCount,
                viewCount: novel.viewCount + 1,
            },
            wholeOwned: owned.has("*"),
            chapters: chapters.map((c) => {
                const free = c.isFree || freeNovel;
                const price = free
                    ? 0
                    : novel.priceType === "chapter"
                      ? c.coinPrice || novel.chapterCoinPrice
                      : novel.coinPrice;
                return {
                    id: c.id,
                    chapterNo: c.chapterNo,
                    title: c.title,
                    isFree: free,
                    coinPrice: price,
                    wordCount: c.wordCount,
                    locked: !(free || owned.has("*") || owned.has(c.id)),
                };
            }),
        };
    }

    /** chapter body; enforces purchase for paid chapters */
    async readerChapter(chapterId: string, userId?: string) {
        const chapter = await this.chapterRepository.findOneBy({ id: chapterId });
        if (!chapter) throw HttpErrorFactory.notFound("章节不存在");
        const novel = await this.novelRepository.findOneBy({ id: chapter.novelId });
        if (!novel) throw HttpErrorFactory.notFound("小说不存在");

        const free = chapter.isFree || this.isNovelFree(novel);
        if (!free) {
            if (!userId) throw HttpErrorFactory.badRequest("请先登录");
            const owned = await this.ownedChapterIds(userId, chapter.novelId);
            if (!owned.has("*") && !owned.has(chapter.id)) {
                throw HttpErrorFactory.badRequest("章节未解锁");
            }
        }
        if (userId) {
            await this.upsertHistory(userId, chapter.novelId, chapter.title);
        }
        return {
            id: chapter.id,
            novelId: chapter.novelId,
            chapterNo: chapter.chapterNo,
            title: chapter.title,
            content: chapter.content,
            wordCount: chapter.wordCount,
            novelTitle: novel.title,
        };
    }

    /**
     * Unlock one chapter or the whole book. Same idempotency shape as the
     * drama unlock: insert purchase record first (partial unique index), then
     * deduct inside the same transaction.
     */
    async purchase(
        userId: string,
        params: { novelId: string; chapterId?: string; whole?: boolean },
    ) {
        const novel = await this.novelRepository.findOneBy({ id: params.novelId, status: true });
        if (!novel) throw HttpErrorFactory.notFound("小说不存在或已下架");
        if (this.isNovelFree(novel)) {
            return { alreadyOwned: true, coins: 0 };
        }

        let coins = 0;
        let chapterId: string | null = null;
        if (params.whole) {
            coins =
                novel.coinPrice > 0
                    ? novel.coinPrice
                    : novel.chapterCoinPrice * Math.max(novel.chapterCount, 1);
            if (coins <= 0) return { alreadyOwned: true, coins: 0 };
        } else {
            if (!params.chapterId) throw HttpErrorFactory.badRequest("请选择章节");
            const chapter = await this.chapterRepository.findOneBy({ id: params.chapterId });
            if (!chapter || chapter.novelId !== params.novelId) {
                throw HttpErrorFactory.badRequest("章节不存在");
            }
            if (chapter.isFree) return { alreadyOwned: true, coins: 0 };
            coins = chapter.coinPrice > 0 ? chapter.coinPrice : novel.chapterCoinPrice;
            chapterId = chapter.id;
            const owned = await this.ownedChapterIds(userId, params.novelId);
            if (owned.has("*")) return { alreadyOwned: true, coins: 0 };
        }

        try {
            await this.dataSource.transaction(async (em) => {
                await em
                    .insert(NovelPurchase, {
                        userId,
                        novelId: params.novelId,
                        chapterId,
                        coins,
                    })
                    .catch((err) => {
                        if ((err as { code?: string }).code === "23505") {
                            throw new AlreadyOwnedError();
                        }
                        throw err;
                    });

                if (coins > 0) {
                    await this.billingService.deductUserPower(
                        {
                            userId,
                            amount: coins,
                            remark: `小说解锁 ${novel.title}${params.whole ? "（整本）" : ""}`,
                        },
                        em,
                    );
                }
            });
        } catch (err) {
            if (err instanceof AlreadyOwnedError) {
                return { alreadyOwned: true, coins: 0 };
            }
            this.logger.error(`novel purchase failed: ${(err as Error).message}`);
            throw err;
        }

        await this.novelRepository.increment({ id: params.novelId }, "saleCount", 1);
        return { alreadyOwned: false, coins };
    }

    async rate(userId: string, novelId: string, score: number) {
        const s = Math.max(1, Math.min(5, Math.round(Number(score) || 5)));
        const existing = await this.ratingRepository.findOneBy({ userId, novelId });
        if (existing) {
            await this.ratingRepository.update({ id: existing.id }, { score: s });
        } else {
            await this.ratingRepository.insert({ userId, novelId, score: s });
        }
        await this.refreshRatingStats(novelId);
        return { success: true, score: s };
    }

    async toggleBookshelf(userId: string, novelId: string) {
        const repo = this.dataSource.getRepository(NovelBookshelf);
        const existing = await repo.findOneBy({ userId, novelId });
        if (existing) {
            await repo.delete({ id: existing.id });
            return { added: false };
        }
        await repo.insert({ userId, novelId });
        return { added: true };
    }

    async myBookshelf(userId: string) {
        const rows = await this.dataSource.query(
            `SELECT b.id, b.created_at, n.id AS novel_id, n.title, n.author, n.cover,
                    n.tag, n.chapter_count, n.rating_avg
               FROM drama.novel_bookshelf b
               JOIN drama.novel n ON n.id = b.novel_id
              WHERE b.user_id = $1
              ORDER BY b.created_at DESC`,
            [userId],
        );
        return rows.map((r: Record<string, unknown>) => ({
            id: r.id,
            novelId: r.novel_id,
            title: r.title,
            author: r.author,
            cover: r.cover,
            tag: r.tag,
            chapterCount: Number(r.chapter_count ?? 0),
            ratingAvg: Number(r.rating_avg ?? 0),
            createdAt: r.created_at,
        }));
    }

    async myHistory(userId: string) {
        const rows = await this.dataSource.query(
            `SELECT h.id, h.chapter, h.updated_at, n.id AS novel_id, n.title, n.cover, n.chapter_count
               FROM drama.novel_reading_history h
               JOIN drama.novel n ON n.id = h.novel_id
              WHERE h.user_id = $1
              ORDER BY h.updated_at DESC`,
            [userId],
        );
        return rows.map((r: Record<string, unknown>) => ({
            id: r.id,
            novelId: r.novel_id,
            title: r.title,
            cover: r.cover,
            chapter: r.chapter,
            chapterCount: Number(r.chapter_count ?? 0),
            updatedAt: r.updated_at,
        }));
    }

    // ---------------- internals ----------------

    private isNovelFree(novel: Novel): boolean {
        return (novel.priceType ?? "free") === "free";
    }

    /** unlocked chapter ids, plus "*" when the whole book is owned */
    private async ownedChapterIds(userId: string, novelId: string): Promise<Set<string>> {
        const rows = await this.purchaseRepository.find({
            where: { userId, novelId },
            select: ["chapterId"],
        });
        const set = new Set<string>();
        for (const row of rows) {
            if (row.chapterId) set.add(row.chapterId);
            else set.add("*");
        }
        return set;
    }

    private async upsertHistory(userId: string, novelId: string, chapterTitle?: string) {
        const repo = this.dataSource.getRepository(NovelReadingHistory);
        const existing = await repo.findOneBy({ userId, novelId });
        if (existing) {
            await repo.update({ id: existing.id }, { chapter: chapterTitle ?? existing.chapter });
        } else {
            await repo.insert({ userId, novelId, chapter: chapterTitle ?? null });
        }
    }
}

class AlreadyOwnedError extends Error {
    constructor() {
        super("already owned");
    }
}
