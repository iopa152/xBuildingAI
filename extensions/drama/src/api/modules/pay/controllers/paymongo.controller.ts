import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController, ExtensionWebController } from "@buildingai/core/decorators";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { Body, Get, Headers, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

import { PaymongoService } from "../services/paymongo.service";

export class CreatePaymongoOrderDto {
    @IsInt()
    @Min(1)
    @Max(1000000)
    coins!: number;

    /**
     * Price in PHP major units, e.g. 99.99
     */
    @Min(0.01)
    price!: number;

    @IsString()
    @Length(1, 32)
    @IsOptional()
    promoCode?: string;
}

/**
 * PayMongo coin payment (web / H5, Philippines)
 */
@ExtensionWebController("paymongo")
export class PaymongoWebController extends BaseController {
    constructor(private readonly paymongoService: PaymongoService) {
        super();
    }

    @Get("config")
    @Public()
    async config() {
        const config = await this.paymongoService.getConfig();
        return { enabled: Boolean(config?.enabled && config.secretKey) };
    }

    @Post("order")
    async createOrder(@Playground() user: UserPlayground, @Body() dto: CreatePaymongoOrderDto) {
        return this.paymongoService.createOrder(user.id, dto);
    }

    @Post("webhook")
    @Public()
    async webhook(
        @Req() req: Request,
        @Headers("paymongo-signature") signature: string,
    ) {
        const raw = Buffer.isBuffer(req.body)
            ? req.body
            : Buffer.from(JSON.stringify(req.body ?? {}));
        return this.paymongoService.handleWebhook(raw, signature);
    }
}

/**
 * PayMongo management (console)
 */
@ExtensionConsoleController("paymongo", "PayMongo 管理")
export class PaymongoConsoleController extends BaseController {
    constructor(private readonly paymongoService: PaymongoService) {
        super();
    }

    @Get("config")
    async getConfig() {
        const config = await this.paymongoService.getConfig();
        if (!config) return null;
        return {
            enabled: config.enabled,
            successUrl: config.successUrl,
            cancelUrl: config.cancelUrl,
            secretKeyMasked: config.secretKey
                ? `${config.secretKey.slice(0, 8)}***${config.secretKey.slice(-4)}`
                : null,
            webhookSecretMasked: config.webhookSecret
                ? `${config.webhookSecret.slice(0, 6)}***`
                : null,
        };
    }

    @Post("config")
    async saveConfig(
        @Body()
        dto: {
            secretKey?: string;
            webhookSecret?: string;
            enabled?: boolean;
            successUrl?: string;
            cancelUrl?: string;
        },
    ) {
        const patch: Record<string, unknown> = {
            enabled: Boolean(dto.enabled),
            successUrl: dto.successUrl?.slice(0, 500) || "/",
            cancelUrl: dto.cancelUrl?.slice(0, 500) || "/",
        };
        if (dto.secretKey && dto.secretKey.trim().length > 8) {
            patch.secretKey = dto.secretKey.trim();
        }
        if (dto.webhookSecret && dto.webhookSecret.trim().length > 6) {
            patch.webhookSecret = dto.webhookSecret.trim();
        }
        const config = await this.paymongoService.saveConfig(patch);
        return { id: config.id, enabled: config.enabled };
    }
}
