import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController, ExtensionWebController } from "@buildingai/core/decorators";
import { Public } from "@buildingai/decorators/public.decorator";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";

import { OpsService } from "../services/ops.service";

/**
 * Playlists / languages / config / agreements (console)
 */
@ExtensionConsoleController("ops", "运营配置")
export class OpsConsoleController extends BaseController {
    constructor(private readonly opsService: OpsService) {
        super();
    }

    // ---- playlists ----

    @Get("playlist")
    async playlists() {
        return this.opsService.listPlaylists();
    }

    @Post("playlist")
    async createPlaylist(@Body() dto: { name: string; description?: string; dramaIds?: string[]; cover?: string; sort?: number }) {
        return this.opsService.createPlaylist(dto);
    }

    @Patch("playlist/:id")
    async updatePlaylist(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: { name?: string; description?: string; dramaIds?: string[]; cover?: string; sort?: number; status?: boolean },
    ) {
        return this.opsService.updatePlaylist(id, dto);
    }

    @Delete("playlist/:id")
    async deletePlaylist(@Param("id", UUIDValidationPipe) id: string) {
        await this.opsService.deletePlaylist(id);
        return { success: true, message: "删除成功" };
    }

    // ---- languages ----

    @Get("language")
    async languages() {
        return this.opsService.listLanguages();
    }

    @Post("language")
    async createLanguage(@Body() dto: {
        code: string;
        name: string;
        nativeName?: string;
        flag?: string;
        sort?: number;
        status?: boolean;
    }) {
        return this.opsService.createLanguage(dto);
    }

    @Patch("language/:id")
    async updateLanguage(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: {
            code?: string;
            name?: string;
            nativeName?: string;
            flag?: string;
            sort?: number;
            status?: boolean;
        },
    ) {
        await this.opsService.updateLanguage(id, dto);
        return { success: true };
    }

    @Delete("language/:id")
    async deleteLanguage(@Param("id", UUIDValidationPipe) id: string) {
        await this.opsService.deleteLanguage(id);
        return { success: true, message: "删除成功" };
    }

    // ---- checkin config ----

    @Get("checkin-config")
    async checkinConfig() {
        return this.opsService.getCheckinConfig();
    }

    @Put("checkin-config")
    async saveCheckinConfig(@Body("rewards") rewards: number[]) {
        if (!Array.isArray(rewards) || rewards.length !== 7) {
            return { success: false, message: "需要 7 个奖励值" };
        }
        await this.opsService.setConfig(
            "checkin_rewards",
            rewards.map((r) => Math.max(0, Math.floor(Number(r) || 0))),
        );
        return { success: true, message: "保存成功" };
    }

    // ---- agreements ----

    @Get("agreement")
    async agreements() {
        return this.opsService.listAgreements();
    }

    @Post("agreement")
    async saveAgreement(@Body() dto: { type: string; title: string; content: string }) {
        return this.opsService.saveAgreement(dto);
    }
}

/**
 * Playlists / agreements (web / H5)
 */
@ExtensionWebController("ops")
export class OpsWebController extends BaseController {
    constructor(private readonly opsService: OpsService) {
        super();
    }

    @Get("playlist")
    @Public()
    async playlists() {
        return this.opsService.listPlaylistsWeb();
    }

    @Get("agreement")
    @Public()
    async agreements() {
        return this.opsService.listAgreements();
    }
}
