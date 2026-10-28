import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Query } from "@nestjs/common";

import { CommentStatus } from "../../../../db/entities/comment-entities.entity";
import { WatchService } from "../../services/watch.service";

/**
 * Watch domain records (console): comments / ratings / favorites / history
 */
@ExtensionConsoleController("watch", "观看互动管理")
export class WatchConsoleController extends BaseController {
    constructor(private readonly watchService: WatchService) {
        super();
    }

    // ---- comments ----

    @Get("comment")
    async comments(
        @Query("dramaId") dramaId?: string,
        @Query("status") status?: string,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        return this.watchService.listCommentsForConsole({ dramaId, status, page, pageSize });
    }

    @Patch("comment/:id/status")
    async setCommentStatus(
        @Param("id", UUIDValidationPipe) id: string,
        @Body("status") status: CommentStatus,
    ) {
        await this.watchService.setCommentStatus(id, status);
        return { success: true, message: "更新成功" };
    }

    @Delete("comment/:id")
    async deleteComment(@Param("id", UUIDValidationPipe) id: string) {
        await this.watchService.deleteComment(id);
        return { success: true, message: "删除成功" };
    }

    // ---- ratings / favorites / history ----

    @Get("rating")
    async ratings(
        @Query("dramaId") dramaId?: string,
        @Query("keyword") keyword?: string,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        const result = await this.watchService.listRatingsForConsole({
            dramaId,
            keyword,
            page,
            pageSize,
        });
        result.items = await this.watchService.attachUserProfiles(
            await this.watchService.attachDramaTitles(result.items),
        );
        return result;
    }

    @Get("favorite")
    async favorites(
        @Query("dramaId") dramaId?: string,
        @Query("keyword") keyword?: string,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        const result = await this.watchService.listFavoritesForConsole({
            dramaId,
            keyword,
            page,
            pageSize,
        });
        result.items = await this.watchService.attachUserProfiles(
            await this.watchService.attachDramaTitles(result.items),
        );
        return result;
    }

    @Get("history")
    async history(
        @Query("userId") userId?: string,
        @Query("dramaId") dramaId?: string,
        @Query("keyword") keyword?: string,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        const result = await this.watchService.listHistoryForConsole({
            userId,
            dramaId,
            keyword,
            page,
            pageSize,
        });
        result.items = await this.watchService.attachUserProfiles(result.items);
        return result;
    }
}
