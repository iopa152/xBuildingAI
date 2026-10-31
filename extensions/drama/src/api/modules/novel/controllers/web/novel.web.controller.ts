import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { Body, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

import { NovelService } from "../../services/novel.service";

class NovelPurchaseDto {
    @IsString()
    novelId!: string;

    @IsOptional()
    @IsString()
    chapterId?: string;

    @IsOptional()
    @IsBoolean()
    whole?: boolean;
}

class NovelRateDto {
    @IsString()
    novelId!: string;

    @IsInt()
    @Min(1)
    @Max(5)
    score!: number;
}

/**
 * Novel reader (H5)
 */
@ExtensionWebController("novel")
export class NovelWebController extends BaseController {
    constructor(private readonly novelService: NovelService) {
        super();
    }

    @Get("list")
    @Public()
    async list(
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
        @Query("keyword") keyword?: string,
        @Query("categoryId") categoryId?: string,
    ) {
        return this.novelService.readerList({ page, pageSize, keyword, categoryId });
    }

    @Get("categories")
    @Public()
    async categories() {
        const rows = await this.novelService.listCategories();
        return rows.filter((c) => c.status);
    }

    /**
     * Detail carries this user's unlock state, so it needs the session. Guest
     * previews use `list` (public) instead.
     */
    @Get("detail/:id")
    async detail(@Param("id") id: string, @Playground() user: UserPlayground) {
        return this.novelService.readerDetail(id, user.id);
    }

    @Get("chapter/:id")
    async chapter(@Param("id") id: string, @Playground() user?: UserPlayground) {
        return this.novelService.readerChapter(id, user?.id);
    }

    @Post("purchase")
    async purchase(@Playground() user: UserPlayground, @Body() dto: NovelPurchaseDto) {
        return this.novelService.purchase(user.id, dto);
    }

    @Post("rate")
    async rate(@Playground() user: UserPlayground, @Body() dto: NovelRateDto) {
        return this.novelService.rate(user.id, dto.novelId, dto.score);
    }

    @Post("bookshelf/toggle")
    async toggleBookshelf(@Playground() user: UserPlayground, @Body() dto: { novelId: string }) {
        return this.novelService.toggleBookshelf(user.id, dto.novelId);
    }

    @Get("bookshelf")
    async bookshelf(@Playground() user: UserPlayground) {
        return this.novelService.myBookshelf(user.id);
    }

    @Get("history")
    async history(@Playground() user: UserPlayground) {
        return this.novelService.myHistory(user.id);
    }

    @Delete("history/:novelId")
    async deleteHistory(@Playground() user: UserPlayground, @Param("novelId") novelId: string) {
        return { success: true, novelId, userId: user.id };
    }
}
