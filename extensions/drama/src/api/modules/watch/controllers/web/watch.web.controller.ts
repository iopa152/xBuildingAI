import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Post, Query } from "@nestjs/common";

import {
    CreateCommentDto,
    CreateRatingDto,
    ReportProgressDto,
    ToggleFavoriteDto,
    ToggleLikeDto,
} from "../../dto";
import { WatchService } from "../../services/watch.service";

/**
 * Watch domain (web / H5)
 */
@ExtensionWebController("watch")
export class WatchWebController extends BaseController {
    constructor(private readonly watchService: WatchService) {
        super();
    }

    // ---- history ----

    @Post("history/report")
    async report(@Playground() user: UserPlayground, @Body() dto: ReportProgressDto) {
        await this.watchService.reportProgress(
            user.id,
            dto.dramaId,
            dto.episodeId,
            dto.progressSeconds,
        );
        return { success: true };
    }

    @Get("history/list")
    async history(
        @Playground() user: UserPlayground,
        @Query("page") page = 1,
        @Query("pageSize") pageSize = 20,
    ) {
        return this.watchService.myHistory(user.id, Number(page), Number(pageSize));
    }

    @Delete("history/:dramaId")
    async removeHistory(
        @Playground() user: UserPlayground,
        @Param("dramaId", UUIDValidationPipe) dramaId: string,
    ) {
        await this.watchService.removeHistory(user.id, dramaId);
        return { success: true };
    }

    // ---- favorite ----

    @Post("favorite/toggle")
    async toggleFavorite(@Playground() user: UserPlayground, @Body() dto: ToggleFavoriteDto) {
        return this.watchService.toggleFavorite(user.id, dto.dramaId);
    }

    @Get("favorite/list")
    async favorites(
        @Playground() user: UserPlayground,
        @Query("page") page = 1,
        @Query("pageSize") pageSize = 20,
    ) {
        return this.watchService.myFavorites(user.id, Number(page), Number(pageSize));
    }

    // ---- like ----

    @Post("like/toggle")
    async toggleLike(@Playground() user: UserPlayground, @Body() dto: ToggleLikeDto) {
        return this.watchService.toggleLike(
            user.id,
            dto.targetType as "drama" | "episode",
            dto.targetId,
        );
    }

    // ---- comment ----

    @Post("comment/create")
    async createComment(@Playground() user: UserPlayground, @Body() dto: CreateCommentDto) {
        return this.watchService.createComment(
            user.id,
            dto.dramaId,
            dto.content,
            dto.episodeId,
            dto.parentId,
        );
    }

    @Public()
    @Get("comment/list")
    async comments(
        @Query("dramaId", UUIDValidationPipe) dramaId: string,
        @Query("page") page = 1,
        @Query("pageSize") pageSize = 20,
    ) {
        return this.watchService.listComments(dramaId, Number(page), Number(pageSize));
    }

    // ---- rating ----

    @Post("rating")
    async rate(@Playground() user: UserPlayground, @Body() dto: CreateRatingDto) {
        return this.watchService.rateDrama(user.id, dto.dramaId, dto.stars);
    }
}
