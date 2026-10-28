import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { Public } from "@buildingai/decorators/public.decorator";
import { Get } from "@nestjs/common";

import { BannerService } from "../../services/banner.service";

/**
 * Banner (web / H5)
 */
@ExtensionWebController("banner")
export class BannerWebController extends BaseController {
    constructor(private readonly bannerService: BannerService) {
        super();
    }

    /**
     * Visible home banners
     */
    @Get("list")
    @Public()
    async list() {
        return this.bannerService.listVisible();
    }
}
