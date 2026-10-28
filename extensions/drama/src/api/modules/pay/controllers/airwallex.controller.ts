import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController, ExtensionWebController } from "@buildingai/core/decorators";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { Body, Get, Headers, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

import { AirwallexService } from "../services/airwallex.service";
import { PayService } from "../services/pay.service";

export class CreateAwxOrderDto {
    @IsInt()
    @Min(1)
    @Max(1000000)
    coins!: number;

    @Min(0.01)
    price!: number;

    @IsString()
    @Length(2, 8)
    @IsOptional()
    currency?: string;

    @IsString()
    @Length(1, 32)
    @IsOptional()
    promoCode?: string;
}

/**
 * Airwallex coin payment (web / H5)
 */
@ExtensionWebController("airwallex")
export class AirwallexWebController extends BaseController {
    constructor(private readonly airwallexService: AirwallexService) {
        super();
    }

    @Get("config")
    @Public()
    async config() {
        const config = await this.airwallexService.getConfig();
        return { enabled: Boolean(config?.enabled) };
    }

    @Post("order")
    async createOrder(@Playground() user: UserPlayground, @Body() dto: CreateAwxOrderDto) {
        return this.airwallexService.createOrder(user.id, dto);
    }

    @Post("webhook")
    @Public()
    async webhook(
        @Req() req: Request,
        @Headers("timestamp") timestamp: string,
        @Headers("x-signature") signature: string,
    ) {
        const raw = Buffer.isBuffer(req.body)
            ? req.body
            : Buffer.from(JSON.stringify(req.body ?? {}));
        return this.airwallexService.handleWebhook(raw, timestamp, signature);
    }
}

/**
 * Airwallex management (console)
 */
@ExtensionConsoleController("airwallex", "Airwallex 管理")
export class AirwallexConsoleController extends BaseController {
    constructor(
        private readonly airwallexService: AirwallexService,
        private readonly payService: PayService,
    ) {
        super();
    }

    @Get("config")
    async getConfig() {
        const config = await this.airwallexService.getConfig();
        if (!config) return null;
        return {
            enabled: config.enabled,
            successUrl: config.successUrl,
            cancelUrl: config.cancelUrl,
            clientId: config.clientId ? `${config.clientId.slice(0, 8)}***` : null,
        };
    }

    @Post("config")
    async saveConfig(
        @Body()
        dto: {
            clientId?: string;
            apiKey?: string;
            webhookSecret?: string;
            enabled?: boolean;
            successUrl?: string;
            cancelUrl?: string;
        },
    ) {
        const payload: Record<string, unknown> = {
            enabled: dto.enabled,
            successUrl: dto.successUrl,
            cancelUrl: dto.cancelUrl,
        };
        if (dto.clientId && dto.clientId.length > 4) payload.clientId = dto.clientId;
        if (dto.apiKey && dto.apiKey.length > 4) payload.apiKey = dto.apiKey;
        if (dto.webhookSecret && dto.webhookSecret.length > 4)
            payload.webhookSecret = dto.webhookSecret;
        await this.airwallexService.saveConfig(payload);
        return { success: true, message: "保存成功" };
    }
}
