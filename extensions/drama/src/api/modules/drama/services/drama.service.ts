import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import type { FindOptionsWhere } from "@buildingai/db/typeorm";
import { ILike, In, Like, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { Drama, DramaStatus } from "../../../db/entities/drama.entity";
import { DramaCategory } from "../../../db/entities/drama-category.entity";
import { Episode } from "../../../db/entities/episode.entity";
import { BatchSetPriceDto, CreateDramaDto, QueryDramaDto, UpdateDramaDto } from "../dto";
import { DramaOrder } from "../dto/query-drama.dto";

/**
 * Drama service (console + web)
 */
@Injectable()
export class DramaService extends BaseService<Drama> {
    constructor(
        @InjectRepository(Drama) private readonly dramaRepository: Repository<Drama>,
        @InjectRepository(DramaCategory)
        private readonly categoryRepository: Repository<DramaCategory>,
    ) {
        super(dramaRepository);
    }

    /**
     * Create a drama
     */
    async createDrama(dto: CreateDramaDto): Promise<Partial<Drama>> {
        const { categoryIds, ...rest } = dto;
        const drama = this.dramaRepository.create({
            ...rest,
            language: dto.language ?? "en",
            status: dto.status ?? DramaStatus.DRAFT,
        });
        if (categoryIds?.length) {
            drama.categories = await this.findCategoriesOrFail(categoryIds);
        }
        return this.dramaRepository.save(drama);
    }

    /**
     * Paginated drama list with filters
     */
    async list(dto: QueryDramaDto) {
        const where: FindOptionsWhere<Drama> = {
            ...(dto.title ? { title: ILike(`%${dto.title}%`) } : {}),
            ...(dto.status ? { status: dto.status } : {}),
            ...(dto.complete !== undefined ? { complete: dto.complete } : {}),
            ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
            ...(dto.language ? { language: dto.language } : {}),
        };

        if (dto.categoryId) {
            const category = await this.categoryRepository.findOne({
                where: { id: dto.categoryId },
                relations: ["dramas"],
            });
            if (!category?.dramas?.length) {
                return { items: [], total: 0, page: dto.page, pageSize: dto.pageSize };
            }
            where.id = In(category.dramas.map((d) => d.id));
        }

        const order =
            dto.order === DramaOrder.HEAT
                ? { heat: "DESC" as const }
                : dto.order === DramaOrder.VIEWS
                  ? { viewCount: "DESC" as const }
                  : { createdAt: "DESC" as const };

        return this.paginate(dto, {
            where,
            relations: ["categories"],
            order: { sort: "DESC", ...order },
        });
    }

    /**
     * Vertical feed of published episodes (web theater)
     */
    async feed(cursor?: string, pageSize = 10) {
        const offset = Math.max(0, Number(cursor) || 0);
        const size = Math.min(50, Math.max(1, Number(pageSize) || 10));
        const dramas = await this.dramaRepository.find({
            where: { status: "published" as never },
            relations: ["categories", "episodes"],
            order: { sort: "DESC", heat: "DESC", createdAt: "DESC" },
        });
        const list = [];
        for (const drama of dramas) {
            const episodes = (drama.episodes ?? [])
                .filter((ep) => ep.status === "published")
                .sort((a, b) => a.episodeNo - b.episodeNo);
            for (const ep of episodes) {
                list.push({
                    id: ep.id,
                    dramaId: drama.id,
                    dramaTitle: drama.title,
                    episodeId: ep.id,
                    episodeNum: ep.episodeNo,
                    totalEpisodes: episodes.length,
                    title: ep.title || drama.title,
                    description: drama.description || "",
                    cover: drama.coverVertical || drama.coverHorizontal || "",
                    tags: (drama.categories ?? []).map((c) => ({ id: c.id, name: c.name })),
                    likeCount: ep.likeCount ?? 0,
                    favoriteCount: drama.favoriteCount ?? 0,
                    isLiked: false,
                    isFavorited: false,
                    duration: ep.duration ?? 0,
                    videoUrl: ep.videoUrl,
                });
            }
        }
        return {
            list: list.slice(offset, offset + size),
            hasMore: offset + size < list.length,
            nextCursor: String(offset + size),
        };
    }

    /**
     * Drama detail with published episodes (web)
     */
    async findDramaById(id: string) {
        const drama = await this.dramaRepository.findOne({
            where: { id },
            relations: ["categories", "episodes"],
        });
        if (!drama) {
            throw HttpErrorFactory.notFound("剧目不存在");
        }
        if (drama.episodes) {
            drama.episodes = drama.episodes
                .filter((ep) => ep.status === "published")
                .sort((a, b) => a.episodeNo - b.episodeNo);
        }
        return drama;
    }

    /**
     * Update a drama (categories replaced when provided)
     */
    async updateDramaById(id: string, dto: UpdateDramaDto) {
        const drama = await this.dramaRepository.findOne({
            where: { id },
            relations: ["categories"],
        });
        if (!drama) {
            throw HttpErrorFactory.notFound("剧目不存在");
        }
        const { categoryIds, ...rest } = dto;
        if (categoryIds) {
            drama.categories = categoryIds.length
                ? await this.findCategoriesOrFail(categoryIds)
                : [];
        }
        return this.dramaRepository.save({ ...drama, ...rest });
    }

    /**
     * Publish / offline a drama
     */
    async setStatus(id: string, status: DramaStatus) {
        const drama = await this.findOneById(id);
        if (!drama) {
            throw HttpErrorFactory.notFound("剧目不存在");
        }
        return this.dramaRepository.save({ ...drama, status });
    }

    /**
     * Toggle featured flag
     */
    async setFeatured(id: string, featured: boolean) {
        const drama = await this.findOneById(id);
        if (!drama) {
            throw HttpErrorFactory.notFound("剧目不存在");
        }
        return this.dramaRepository.save({ ...drama, featured });
    }

    /**
     * Batch set whole-drama price
     */
    async batchSetPrice(dto: BatchSetPriceDto) {
        await this.dramaRepository.update(
            { id: In(dto.ids) },
            { wholePrice: dto.wholePrice },
        );
        return { success: true, message: "批量设置价格成功" };
    }

    /**
     * Delete dramas (episodes cascade)
     */
    async delete(id: string) {
        await this.dramaRepository.delete(id);
    }

    async batchDelete(ids: string[]) {
        await this.dramaRepository.delete({ id: In(ids) });
    }

    /**
     * Increment view count (web detail endpoint)
     */
    async incrementViewCount(id: string) {
        await this.dramaRepository.increment({ id }, "viewCount", 1);
    }

    private async findCategoriesOrFail(ids: string[]): Promise<DramaCategory[]> {
        const categories = await this.categoryRepository.find({
            where: { id: In(ids) },
        });
        if (categories.length !== ids.length) {
            throw HttpErrorFactory.badRequest("存在无效的分类");
        }
        return categories;
    }
}

/**
 * Re-export for DTO typing convenience
 */
export type { Episode };
