import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { Banner } from "../../../../db/entities/banner.entity";
import { CreateBannerDto, QueryBannerDto, UpdateBannerDto } from "../../dto";
import { BannerService } from "../../services/banner.service";

/**
 * Banner management (console)
 */
@ExtensionConsoleController("banner", "轮播图管理")
export class BannerController extends BaseController {
    constructor(private readonly bannerService: BannerService) {
        super();
    }

    @Post()
    async create(@Body() dto: CreateBannerDto): Promise<Partial<Banner>> {
        return this.bannerService.createBanner(dto);
    }

    @Get()
    async findAll(@Query() dto: QueryBannerDto) {
        return this.bannerService.list(dto);
    }

    @Get(":id")
    async findOne(@Param("id", UUIDValidationPipe) id: string) {
        return this.bannerService.findOneById(id);
    }

    @Patch(":id")
    async update(@Param("id", UUIDValidationPipe) id: string, @Body() dto: UpdateBannerDto) {
        return this.bannerService.updateBannerById(id, dto);
    }

    @Delete(":id")
    async remove(@Param("id", UUIDValidationPipe) id: string) {
        const banner = await this.bannerService.findOneById(id);
        if (!banner) {
            return { success: false, message: "轮播图不存在" };
        }
        await this.bannerService.delete(id);
        return { success: true, message: "删除成功" };
    }

    @Post("batch-delete")
    async batchRemove(@Body("ids") ids: string[]) {
        await this.bannerService.batchDelete(ids);
        return { success: true, message: "批量删除成功" };
    }
}
