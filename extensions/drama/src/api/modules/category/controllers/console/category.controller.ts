import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { DramaCategory } from "../../../../db/entities/drama-category.entity";
import { CreateDramaCategoryDto, QueryDramaCategoryDto, UpdateDramaCategoryDto } from "../../dto";
import { CategoryService } from "../../services/category.service";

/**
 * Drama category management (console)
 */
@ExtensionConsoleController("category", "短剧分类管理")
export class CategoryController extends BaseController {
    constructor(private readonly categoryService: CategoryService) {
        super();
    }

    @Post()
    async create(@Body() dto: CreateDramaCategoryDto): Promise<Partial<DramaCategory>> {
        return this.categoryService.createCategory(dto);
    }

    @Get()
    async findAll(@Query() dto: QueryDramaCategoryDto) {
        return this.categoryService.list(dto);
    }

    @Get(":id")
    async findOne(@Param("id", UUIDValidationPipe) id: string) {
        return this.categoryService.findOneById(id);
    }

    @Patch(":id")
    async update(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: UpdateDramaCategoryDto,
    ) {
        return this.categoryService.updateCategoryById(id, dto);
    }

    @Delete(":id")
    async remove(@Param("id", UUIDValidationPipe) id: string) {
        const category = await this.categoryService.findOneById(id);
        if (!category) {
            return { success: false, message: "分类不存在" };
        }
        await this.categoryService.delete(id);
        return { success: true, message: "删除成功" };
    }

    @Post("batch-delete")
    async batchRemove(@Body("ids") ids: string[]) {
        await this.categoryService.batchDelete(ids);
        return { success: true, message: "批量删除成功" };
    }
}
