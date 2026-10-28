import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { Public } from "@buildingai/decorators/public.decorator";
import { Get, Query } from "@nestjs/common";

import { QueryEpisodeDto } from "../../dto";
import { EpisodeService } from "../../services/episode.service";

/**
 * Episode (web / H5)
 */
@ExtensionWebController("episode")
export class EpisodeWebController extends BaseController {
    constructor(private readonly episodeService: EpisodeService) {
        super();
    }

    /**
     * Published episodes of a drama, ordered by episodeNo
     */
    @Get("list")
    @Public()
    async list(@Query() dto: QueryEpisodeDto) {
        return this.episodeService.listByDrama(dto.dramaId, true);
    }
}
