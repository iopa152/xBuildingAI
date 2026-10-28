import { BaseController } from "@buildingai/base";
import {
    ExtensionConsoleController,
    ExtensionWebController,
} from "@buildingai/core/decorators";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { Body, Get, Post, Query } from "@nestjs/common";
import { IsOptional, IsString, Length } from "class-validator";

import { VodService } from "../services/vod.service";

export class VodUploadRequestDto {
    @IsString()
    @Length(1, 128)
    title!: string;

    @IsString()
    @Length(1, 255)
    fileName!: string;
}

/**
 * VOD upload & playback (web / H5)
 */
@ExtensionWebController("vod")
export class VodWebController extends BaseController {
    constructor(private readonly vodService: VodService) {
        super();
    }

    /**
     * Whether VOD direct-upload is available (H5 chooses upload strategy)
     */
    @Get("status")
    @Public()
    async status() {
        const config = await this.vodService.getConfig();
        return { enabled: Boolean(config?.enabled && config.accessKeyId) };
    }

    /**
     * Aliyun upload credentials for the browser uploader
     */
    @Post("upload-credentials")
    async uploadCredentials(
        @Playground() user: UserPlayground,
        @Body() dto: VodUploadRequestDto,
    ) {
        return this.vodService.createUpload({
            title: dto.title,
            fileName: dto.fileName,
            userId: user.id,
        });
    }

    @Post("upload-refresh")
    async refreshUpload(@Body("videoId") videoId: string) {
        return this.vodService.refreshUpload(videoId);
    }

    /**
     * Resolve a playback url for a transcoded video
     */
    @Get("play-url")
    @Public()
    async playUrl(@Query("videoId") videoId: string) {
        return this.vodService.getPlayUrl(videoId);
    }
}

/**
 * VOD configuration (console)
 */
@ExtensionConsoleController("vod", "点播配置")
export class VodConsoleController extends BaseController {
    constructor(private readonly vodService: VodService) {
        super();
    }

    @Get("config")
    async getConfig() {
        const config = await this.vodService.getConfig();
        if (!config) return null;
        return {
            provider: config.provider,
            region: config.region,
            enabled: config.enabled,
            accessKeyIdMasked: config.accessKeyId
                ? `${config.accessKeyId.slice(0, 6)}***`
                : null,
        };
    }

    @Post("config")
    async saveConfig(
        @Body()
        dto: {
            provider?: string;
            region?: string;
            accessKeyId?: string;
            accessKeySecret?: string;
            enabled?: boolean;
        },
    ) {
        const payload: Record<string, unknown> = {
            provider: dto.provider,
            region: dto.region,
            enabled: dto.enabled,
        };
        if (dto.accessKeyId && dto.accessKeyId.length > 4)
            payload.accessKeyId = dto.accessKeyId;
        if (dto.accessKeySecret && dto.accessKeySecret.length > 4)
            payload.accessKeySecret = dto.accessKeySecret;
        await this.vodService.saveConfig(payload);
        return { success: true, message: "保存成功" };
    }
}
