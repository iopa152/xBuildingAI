import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { Public } from "@buildingai/decorators/public.decorator";
import { Get, Query } from "@nestjs/common";

import { CategoryService } from "../../services/category.service";

/**
 * Drama category (web / H5)
 */
@ExtensionWebController("category")
export class CategoryWebController extends BaseController {
    constructor(private readonly categoryService: CategoryService) {
        super();
    }

    /**
     * Enabled categories, optional ?language=en
     */
    @Get("list")
    @Public()
    async list(@Query("language") language?: string) {
        return this.categoryService.listEnabled(language);
    }
}
