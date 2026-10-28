import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Post, Query } from "@nestjs/common";

import { Episode } from "../../../../db/entities/episode.entity";
import { BatchCreateEpisodesDto, BatchEpisodePriceDto, QueryEpisodeDto, SaveEpisodeDto } from "../../dto";
import { EpisodeService } from "../../services/episode.service";

/**
 * Episode management (console)
 */
@ExtensionConsoleController("episode", "短剧剧集管理")
export class EpisodeController extends BaseController {
    constructor(private readonly episodeService: EpisodeService) {
        super();
    }

    /**
     * Create / update a single episode (upsert by dramaId + episodeNo)
     */
    @Post()
    async save(@Body() dto: SaveEpisodeDto): Promise<Partial<Episode>> {
        return this.episodeService.saveEpisode(dto);
    }

    /**
     * Batch upload episodes with auto numbering
     */
    @Post("batch-create")
    async batchCreate(@Body() dto: BatchCreateEpisodesDto) {
        return this.episodeService.batchCreate(dto);
    }

    /**
     * Batch set coin price
     */
    @Post("batch-price")
    async batchSetPrice(@Body() dto: BatchEpisodePriceDto) {
        return this.episodeService.batchSetPrice(dto);
    }

    @Get()
    async listByDrama(@Query() dto: QueryEpisodeDto) {
        return this.episodeService.listByDrama(dto.dramaId);
    }

    @Delete(":id")
    async remove(@Param("id", UUIDValidationPipe) id: string) {
        await this.episodeService.delete(id);
        return { success: true, message: "删除成功" };
    }

    @Post("batch-delete")
    async batchRemove(@Body("ids") ids: string[]) {
        await this.episodeService.batchDelete(ids);
        return { success: true, message: "批量删除成功" };
    }
}
