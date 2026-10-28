import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import {
    CreatePanelDto,
    CreatePixelDto,
    CreatePromoLinkDto,
    UpdatePanelDto,
    UpdatePixelDto,
    UpdatePromoLinkDto,
} from "../../dto";
import { PromotionService } from "../../services/promotion.service";

/**
 * Promotion management (console)
 */
@ExtensionConsoleController("promotion", "投放管理")
export class PromotionConsoleController extends BaseController {
    constructor(private readonly promotionService: PromotionService) {
        super();
    }

    // ---- overview / LTV ----

    @Get("overview")
    async overview(
        @Query("from") from: string,
        @Query("to") to: string,
        @Query("linkId") linkId?: string,
        @Query("dramaId") dramaId?: string,
        @Query("creator") creator?: string,
        @Query("dimension") dimension?: "day" | "link" | "drama",
    ) {
        return this.promotionService.overview({
            from,
            to,
            linkId,
            dramaId,
            creator,
            dimension,
        });
    }

    @Get("ltv")
    async ltv(
        @Query("days") days?: number,
        @Query("from") from?: string,
        @Query("to") to?: string,
        @Query("linkId") linkId?: string,
        @Query("creator") creator?: string,
        @Query("dramaId") dramaId?: string,
    ) {
        return this.promotionService.ltvStats({ days, from, to, linkId, creator, dramaId });
    }

    // ---- promo links ----

    @Get("link")
    async links(
        @Query("keyword") keyword?: string,
        @Query("status") status?: string,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        return this.promotionService.listLinksForConsole({
            keyword,
            status,
            page,
            pageSize,
        });
    }

    @Get("capi/monitor/daily")
    async capiMonitorDaily(@Query("from") from: string, @Query("to") to: string) {
        return this.promotionService.capiMonitorDaily({ from, to });
    }

    @Get("capi/monitor")
    async capiMonitor() {
        return this.promotionService.capiMonitor();
    }

    @Post("link")
    async createLink(@Body() dto: CreatePromoLinkDto) {
        return this.promotionService.createLink(dto);
    }

    @Patch("link/:id")
    async updateLink(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: UpdatePromoLinkDto,
    ) {
        await this.promotionService.updateLink(id, dto);
        return { success: true, message: "更新成功" };
    }

    @Delete("link/:id")
    async deleteLink(@Param("id", UUIDValidationPipe) id: string) {
        await this.promotionService.deleteLink(id);
        return { success: true, message: "删除成功" };
    }

    // ---- price panels ----

    @Get("episode")
    async episodes(@Query("dramaId", UUIDValidationPipe) dramaId: string) {
        return this.promotionService.listEpisodes(dramaId);
    }

    @Get("panel")
    async panels() {
        return this.promotionService.listPanels();
    }

    @Post("panel")
    async createPanel(@Body() dto: CreatePanelDto) {
        return this.promotionService.createPanel(dto);
    }

    @Patch("panel/:id")
    async updatePanel(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: UpdatePanelDto,
    ) {
        await this.promotionService.updatePanel(id, dto);
        return { success: true, message: "更新成功" };
    }

    @Delete("panel/:id")
    async deletePanel(@Param("id", UUIDValidationPipe) id: string) {
        await this.promotionService.deletePanel(id);
        return { success: true, message: "删除成功" };
    }

    // ---- pixels ----

    @Get("pixel")
    async pixels() {
        return this.promotionService.listPixels();
    }

    @Post("pixel")
    async createPixel(@Body() dto: CreatePixelDto) {
        return this.promotionService.createPixel(dto);
    }

    @Patch("pixel/:id")
    async updatePixel(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: UpdatePixelDto,
    ) {
        await this.promotionService.updatePixel(id, dto);
        return { success: true, message: "更新成功" };
    }

    @Delete("pixel/:id")
    async deletePixel(@Param("id", UUIDValidationPipe) id: string) {
        await this.promotionService.deletePixel(id);
        return { success: true, message: "删除成功" };
    }

    // ---- logs ----

    @Get("click")
    async clicks(
        @Query("linkId") linkId?: string,
        @Query("keyword") keyword?: string,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        return this.promotionService.listClicks({ linkId, keyword, page, pageSize });
    }

    @Get("capi")
    async capiEvents(
        @Query("pixelId") pixelId?: string,
        @Query("keyword") keyword?: string,
        @Query("status") status?: string,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        return this.promotionService.listCapiEvents({
            pixelId,
            keyword,
            status,
            page,
            pageSize,
        });
    }
}
