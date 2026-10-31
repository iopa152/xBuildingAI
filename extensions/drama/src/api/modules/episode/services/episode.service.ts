import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { Drama } from "../../../db/entities/drama.entity";
import { Episode } from "../../../db/entities/episode.entity";
import {
    BatchCreateEpisodesDto,
    BatchEpisodePriceDto,
    BatchEpisodeSettingsDto,
    EpisodeSettingsPayloadDto,
    SaveEpisodeDto,
} from "../dto";

/**
 * Episode service (console + web)
 */
@Injectable()
export class EpisodeService extends BaseService<Episode> {
    constructor(
        @InjectRepository(Episode) private readonly episodeRepository: Repository<Episode>,
        @InjectRepository(Drama) private readonly dramaRepository: Repository<Drama>,
    ) {
        super(episodeRepository);
    }

    /**
     * Create or update a single episode (upsert by dramaId+episodeNo)
     */
    async saveEpisode(dto: SaveEpisodeDto): Promise<Partial<Episode>> {
        const drama = await this.dramaRepository.findOneBy({ id: dto.dramaId });
        if (!drama) {
            throw HttpErrorFactory.badRequest("剧目不存在");
        }
        const { publishTime, ...rest } = dto;
        const payload: Partial<Episode> = {
            ...rest,
            publishTime: publishTime ? new Date(publishTime) : null,
        };
        const existing = await this.episodeRepository.findOne({
            where: { drama: { id: dto.dramaId }, episodeNo: dto.episodeNo },
        });
        if (existing) {
            return this.episodeRepository.save({ ...existing, ...payload });
        }
        const episode = this.episodeRepository.create({
            ...payload,
            drama,
            status: dto.status ?? "published",
        });
        const saved = await this.episodeRepository.save(episode);
        await this.refreshDramaEpisodeCount(dto.dramaId);
        return saved;
    }

    /**
     * Batch create episodes with auto numbering (bulk upload)
     */
    async batchCreate(dto: BatchCreateEpisodesDto): Promise<Partial<Episode>[]> {
        const drama = await this.dramaRepository.findOneBy({ id: dto.dramaId });
        if (!drama) {
            throw HttpErrorFactory.badRequest("剧目不存在");
        }

        const existing = await this.episodeRepository.find({
            where: { drama: { id: dto.dramaId } },
        });
        const existingNos = new Set(existing.map((e) => e.episodeNo));

        let nextNo = dto.startNo ?? Math.max(0, ...existingNos) + 1;
        const toInsert: Episode[] = [];
        for (const item of dto.items) {
            while (existingNos.has(nextNo)) {
                nextNo += 1;
            }
            existingNos.add(nextNo);
            toInsert.push(
                this.episodeRepository.create({
                    drama,
                    episodeNo: nextNo,
                    title: item.title,
                    videoUrl: item.videoUrl,
                    duration: item.duration ?? 0,
                    coinPrice: dto.defaultCoinPrice ?? 0,
                    isFree: dto.defaultFree ?? false,
                    status: "published",
                }),
            );
            nextNo += 1;
        }
        const saved = await this.episodeRepository.save(toInsert);
        await this.refreshDramaEpisodeCount(dto.dramaId);
        return saved;
    }

    /**
     * Episodes of a drama ordered by episodeNo
     */
    async listByDrama(dramaId: string, onlyPublished = false): Promise<Episode[]> {
        return this.episodeRepository.find({
            where: {
                drama: { id: dramaId },
                ...(onlyPublished ? { status: "published" as never } : {}),
            },
            relations: ["drama"],
            order: { episodeNo: "ASC" },
        });
    }

    /**
     * Batch set coin price
     */
    async batchSetPrice(dto: BatchEpisodePriceDto) {
        await this.episodeRepository.update(
            { id: In(dto.ids) },
            { coinPrice: dto.coinPrice },
        );
        return { success: true, message: "批量定价成功" };
    }

    /**
     * Batch update episodes by number range, by condition filter or all at once
     */
    async batchSettings(dto: BatchEpisodeSettingsDto) {
        const drama = await this.dramaRepository.findOneBy({ id: dto.dramaId });
        if (!drama) {
            throw HttpErrorFactory.badRequest("剧目不存在");
        }
        const episodes = await this.episodeRepository.find({
            where: { drama: { id: dto.dramaId } },
            order: { episodeNo: "ASC" },
        });

        let affected = 0;
        if (dto.mode === "range") {
            const rules = dto.rules ?? [];
            if (rules.length === 0) {
                throw HttpErrorFactory.badRequest("请先添加规则");
            }
            for (const rule of rules) {
                if (rule.max !== undefined && rule.max < rule.min) {
                    throw HttpErrorFactory.badRequest(
                        `第 ${rule.min}-${rule.max} 集的集数范围不正确`,
                    );
                }
            }
            for (const episode of episodes) {
                const patch: Partial<Episode> = {};
                for (const rule of rules) {
                    if (episode.episodeNo < rule.min) continue;
                    if (rule.max !== undefined && episode.episodeNo > rule.max) continue;
                    Object.assign(patch, this.buildEpisodePatch(rule));
                }
                if (Object.keys(patch).length === 0) continue;
                await this.episodeRepository.update(episode.id, patch);
                affected += 1;
            }
        } else if (dto.mode === "filter") {
            const filters = new Set(dto.filters ?? []);
            if (filters.size === 0) {
                throw HttpErrorFactory.badRequest("请先选择筛选条件");
            }
            const patch = this.buildEpisodePatch(dto.settings ?? {});
            if (Object.keys(patch).length === 0) {
                throw HttpErrorFactory.badRequest("请设置批量更新内容");
            }
            for (const episode of episodes) {
                if (!this.matchEpisodeFilters(episode, filters)) continue;
                await this.episodeRepository.update(episode.id, patch);
                affected += 1;
            }
        } else {
            const patch = this.buildEpisodePatch(dto.settings ?? {});
            if (Object.keys(patch).length === 0) {
                throw HttpErrorFactory.badRequest("请设置批量更新内容");
            }
            for (const episode of episodes) {
                await this.episodeRepository.update(episode.id, patch);
                affected += 1;
            }
        }

        return { success: true, message: `已更新 ${affected} 集`, affected };
    }

    private buildEpisodePatch(settings: EpisodeSettingsPayloadDto): Partial<Episode> {
        const patch: Partial<Episode> = {};
        if (settings.isFree !== undefined) {
            patch.isFree = settings.isFree;
            if (settings.isFree) patch.coinPrice = 0;
        }
        if (settings.coinPrice !== undefined) {
            patch.coinPrice = settings.isFree ? 0 : settings.coinPrice;
        }
        if (settings.vipFree !== undefined) {
            patch.vipFree = settings.vipFree;
        }
        if (settings.status !== undefined) {
            patch.status = settings.status;
        }
        return patch;
    }

    private matchEpisodeFilters(episode: Episode, filters: Set<string>): boolean {
        const matches: Record<string, boolean> = {
            noPrice: episode.coinPrice === 0 && !episode.isFree,
            free: episode.isFree,
            paid: !episode.isFree,
            draft: episode.status === "draft",
            published: episode.status === "published",
        };
        return [...filters].some((key) => matches[key] === true);
    }

    async delete(id: string) {
        const episode = await this.episodeRepository.findOne({
            where: { id },
            relations: ["drama"],
        });
        if (!episode) {
            throw HttpErrorFactory.notFound("剧集不存在");
        }
        await this.episodeRepository.delete(id);
        await this.refreshDramaEpisodeCount(episode.drama.id);
    }

    async batchDelete(ids: string[]) {
        await this.episodeRepository.delete({ id: In(ids) });
    }

    private async refreshDramaEpisodeCount(dramaId: string) {
        const count = await this.episodeRepository.count({
            where: { drama: { id: dramaId } },
        });
        await this.dramaRepository.update({ id: dramaId }, { episodeCount: count });
    }
}
