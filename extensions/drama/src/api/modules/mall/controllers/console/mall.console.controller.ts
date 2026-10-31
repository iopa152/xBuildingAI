import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { MallCategory, MallGoods } from "../../../../db/entities/mall-entities.entity";
import { MallService } from "../../services/mall.service";

/**
 * Mall management (categories / goods / orders)
 */
@ExtensionConsoleController("mall", "商城管理")
export class MallConsoleController extends BaseController {
    constructor(private readonly mallService: MallService) {
        super();
    }

    // ---- categories ----

    @Get("category")
    async categories() {
        return this.mallService.listCategories();
    }

    @Post("category")
    async createCategory(@Body() dto: Partial<MallCategory>) {
        return this.mallService.createCategory(dto);
    }

    @Patch("category/:id")
    async updateCategory(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: Partial<MallCategory>,
    ) {
        return this.mallService.updateCategory(id, dto);
    }

    @Delete("category/:id")
    async deleteCategory(@Param("id", UUIDValidationPipe) id: string) {
        return this.mallService.deleteCategory(id);
    }

    // ---- goods ----

    @Get("goods")
    async goods(
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
        @Query("keyword") keyword?: string,
        @Query("status") status?: string,
    ) {
        return this.mallService.listGoods({ page, pageSize, keyword, status });
    }

    @Get("goods/:id")
    async goodsDetail(@Param("id", UUIDValidationPipe) id: string) {
        return this.mallService.getGoods(id);
    }

    @Post("goods")
    async createGoods(@Body() dto: Partial<MallGoods>) {
        return this.mallService.createGoods(dto);
    }

    @Patch("goods/:id")
    async updateGoods(@Param("id", UUIDValidationPipe) id: string, @Body() dto: Partial<MallGoods>) {
        return this.mallService.updateGoods(id, dto);
    }

    @Delete("goods/:id")
    async deleteGoods(@Param("id", UUIDValidationPipe) id: string) {
        return this.mallService.deleteGoods(id);
    }

    // ---- orders ----

    @Get("order")
    async orders(
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
        @Query("status") status?: string,
        @Query("keyword") keyword?: string,
    ) {
        return this.mallService.listOrders({ page, pageSize, status, keyword });
    }

    @Get("order/:id")
    async orderDetail(@Param("id", UUIDValidationPipe) id: string) {
        return this.mallService.getOrder(id);
    }

    @Post("order/:id/ship")
    async ship(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() body: { logisticsCompany?: string; logisticsNo?: string; remark?: string },
    ) {
        return this.mallService.ship(id, body);
    }

    @Post("order/:id/cancel")
    async cancel(@Param("id", UUIDValidationPipe) id: string) {
        return this.mallService.cancel(id);
    }
}
