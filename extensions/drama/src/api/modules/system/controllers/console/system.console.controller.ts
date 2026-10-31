import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Query } from "@nestjs/common";

import { SystemService } from "../../services/system.service";

/**
 * Routine management: attachments, admin logs and personal profile
 */
@ExtensionConsoleController("system", "常规管理")
export class SystemConsoleController extends BaseController {
    constructor(private readonly systemService: SystemService) {
        super();
    }

    @Get("file")
    async files(
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
        @Query("keyword") keyword?: string,
    ) {
        return this.systemService.listFiles({ page, pageSize, keyword });
    }

    @Delete("file/:id")
    async deleteFile(@Param("id", UUIDValidationPipe) id: string) {
        return this.systemService.deleteFile(id);
    }

    @Get("admin-log")
    async adminLogs(@Query("page") page?: number, @Query("pageSize") pageSize?: number) {
        return this.systemService.listAdminLogs({ page, pageSize });
    }

    @Get("profile")
    async profile(@Playground() user: UserPlayground) {
        return this.systemService.getProfile(user.id);
    }

    @Patch("profile")
    async updateProfile(
        @Playground() user: UserPlayground,
        @Body() body: { nickname?: string; email?: string; phone?: string; avatar?: string },
    ) {
        return this.systemService.updateProfile(user.id, body);
    }
}
