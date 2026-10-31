import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { Novel, NovelCategory } from "../../../../db/entities/novel-entities.entity";
import { NovelService } from "../../services/novel.service";

/**
 * Novel management (list / categories / ratings / bookshelf / history / purchases)
 */
@ExtensionConsoleController("novel", "小说管理")
export class NovelConsoleController extends BaseController {
    constructor(private readonly novelService: NovelService) {
        super();
    }

    @Get("category")
    async categories() {
        return this.novelService.listCategories();
    }

    @Post("category")
    async createCategory(@Body() dto: Partial<NovelCategory>) {
        return this.novelService.createCategory(dto);
    }

    @Patch("category/:id")
    async updateCategory(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: Partial<NovelCategory>,
    ) {
        return this.novelService.updateCategory(id, dto);
    }

    @Delete("category/:id")
    async deleteCategory(@Param("id", UUIDValidationPipe) id: string) {
        return this.novelService.deleteCategory(id);
    }

    @Get("book")
    async novels(
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
        @Query("keyword") keyword?: string,
        @Query("status") status?: string,
        @Query("categoryId") categoryId?: string,
        @Query("priceType") priceType?: string,
    ) {
        return this.novelService.listNovels({ page, pageSize, keyword, status, categoryId, priceType });
    }

    @Post("book")
    async createNovel(@Body() dto: Partial<Novel>) {
        return this.novelService.createNovel(dto);
    }

    @Patch("book/:id")
    async updateNovel(@Param("id", UUIDValidationPipe) id: string, @Body() dto: Partial<Novel>) {
        return this.novelService.updateNovel(id, dto);
    }

    @Delete("book/:id")
    async deleteNovel(@Param("id", UUIDValidationPipe) id: string) {
        return this.novelService.deleteNovel(id);
    }

    @Get("record/:type")
    async records(
        @Param("type") type: "rating" | "bookshelf" | "history" | "purchase",
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
        @Query("keyword") keyword?: string,
    ) {
        return this.novelService.listRecords(type, { page, pageSize, keyword });
    }

    @Delete("record/:type/:id")
    async deleteRecord(
        @Param("type") type: "rating" | "bookshelf" | "history" | "purchase",
        @Param("id", UUIDValidationPipe) id: string,
    ) {
        return this.novelService.deleteRecord(type, id);
    }

    // ---------------- chapters ----------------

    @Get("chapter/:id/content")
    async chapterContent(@Param("id", UUIDValidationPipe) id: string) {
        return this.novelService.getChapter(id);
    }

    @Get("chapter")
    async chapters(@Query("novelId", UUIDValidationPipe) novelId: string) {
        return this.novelService.listChapters(novelId);
    }

    @Post("chapter")
    async createChapter(
        @Body()
        dto: {
            novelId: string;
            chapterNo?: number;
            title: string;
            content?: string;
            isFree?: boolean;
            coinPrice?: number;
        },
    ) {
        return this.novelService.createChapter(dto);
    }

    @Patch("chapter/:id")
    async updateChapter(
        @Param("id", UUIDValidationPipe) id: string,
        @Body()
        dto: {
            chapterNo?: number;
            title?: string;
            content?: string;
            isFree?: boolean;
            coinPrice?: number;
        },
    ) {
        return this.novelService.updateChapter(id, dto);
    }

    @Delete("chapter/:id")
    async deleteChapter(@Param("id", UUIDValidationPipe) id: string) {
        return this.novelService.deleteChapter(id);
    }

    @Post("chapter/import")
    async importChapters(@Body() dto: { novelId: string; raw: string }) {
        return this.novelService.batchImportChapters(dto.novelId, dto.raw);
    }
}
