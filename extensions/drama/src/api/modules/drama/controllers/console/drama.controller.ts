import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { Drama, DramaStatus } from "../../../../db/entities/drama.entity";
import { BatchSetPriceDto, CreateDramaDto, QueryDramaDto, UpdateDramaDto } from "../../dto";
import { DramaService } from "../../services/drama.service";

/**
 * Drama management (console)
 */
@ExtensionConsoleController("drama", "短剧剧目管理")
export class DramaController extends BaseController {
    constructor(private readonly dramaService: DramaService) {
        super();
    }

    @Post()
    async create(@Body() dto: CreateDramaDto): Promise<Partial<Drama>> {
        return this.dramaService.createDrama(dto);
    }

    @Get()
    async findAll(@Query() dto: QueryDramaDto) {
        return this.dramaService.list(dto);
    }

    @Get(":id")
    async findOne(@Param("id", UUIDValidationPipe) id: string) {
        return this.dramaService.findDramaById(id);
    }

    @Patch(":id")
    async update(@Param("id", UUIDValidationPipe) id: string, @Body() dto: UpdateDramaDto) {
        return this.dramaService.updateDramaById(id, dto);
    }

    @Delete(":id")
    async remove(@Param("id", UUIDValidationPipe) id: string) {
        const drama = await this.dramaService.findOneById(id);
        if (!drama) {
            return { success: false, message: "剧目不存在" };
        }
        await this.dramaService.delete(id);
        return { success: true, message: "删除成功" };
    }

    @Post("batch-delete")
    async batchRemove(@Body("ids") ids: string[]) {
        await this.dramaService.batchDelete(ids);
        return { success: true, message: "批量删除成功" };
    }

    @Post("batch-price")
    async batchSetPrice(@Body() dto: BatchSetPriceDto) {
        return this.dramaService.batchSetPrice(dto);
    }

    @Post(":id/publish")
    async publish(@Param("id", UUIDValidationPipe) id: string) {
        await this.dramaService.setStatus(id, DramaStatus.PUBLISHED);
        return { success: true, message: "上线成功" };
    }

    @Post(":id/offline")
    async offline(@Param("id", UUIDValidationPipe) id: string) {
        await this.dramaService.setStatus(id, DramaStatus.OFFLINE);
        return { success: true, message: "下线成功" };
    }

    @Post(":id/featured")
    async setFeatured(
        @Param("id", UUIDValidationPipe) id: string,
        @Body("featured") featured: boolean,
    ) {
        await this.dramaService.setFeatured(id, !!featured);
        return { success: true, message: "设置成功" };
    }
}
