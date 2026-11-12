import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { Get, Query } from "@nestjs/common";

import { DistributionService } from "./distribution.service";

/**
 * 分销报表 (console)
 */
@ExtensionConsoleController("distribution", "分销报表")
export class DistributionConsoleController extends BaseController {
    constructor(private readonly distributionService: DistributionService) {
        super();
    }

    @Get("report")
    report(
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
        @Query("keyword") keyword?: string,
    ) {
        return this.distributionService.report({ page, pageSize, keyword });
    }
}
