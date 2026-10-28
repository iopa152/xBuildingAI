import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Get, Param, Post } from "@nestjs/common";

import { UnlockDramaDto, UnlockEpisodeDto } from "../../dto";
import { UnlockService } from "../../services/unlock.service";

/**
 * Unlock (web / H5, requires login)
 */
@ExtensionWebController("unlock")
export class UnlockWebController extends BaseController {
    constructor(private readonly unlockService: UnlockService) {
        super();
    }

    /**
     * Unlock one episode
     */
    @Post("episode")
    async unlockEpisode(
        @Playground() user: UserPlayground,
        @Body() dto: UnlockEpisodeDto,
    ) {
        return this.unlockService.unlockEpisode(user.id, dto.episodeId);
    }

    /**
     * Unlock the whole drama
     */
    @Post("drama")
    async unlockDrama(@Playground() user: UserPlayground, @Body() dto: UnlockDramaDto) {
        return this.unlockService.unlockWholeDrama(user.id, dto.dramaId);
    }

    /**
     * My unlock state for a drama
     */
    @Get("status/:dramaId")
    async status(
        @Playground() user: UserPlayground,
        @Param("dramaId", UUIDValidationPipe) dramaId: string,
    ) {
        return this.unlockService.getDramaUnlockState(user.id, dramaId);
    }
}
