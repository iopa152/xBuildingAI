import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { Drama } from "../../../db/entities/drama.entity";
import { Episode } from "../../../db/entities/episode.entity";
import { BatchCreateEpisodesDto, BatchEpisodePriceDto, SaveEpisodeDto } from "../dto";

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
        const existing = await this.episodeRepository.findOne({
            where: { drama: { id: dto.dramaId }, episodeNo: dto.episodeNo },
        });
        if (existing) {
            return this.episodeRepository.save({ ...existing, ...dto });
        }
        const episode = this.episodeRepository.create({
            ...dto,
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
