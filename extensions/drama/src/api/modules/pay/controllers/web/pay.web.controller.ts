import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { Body, Get, Headers, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";

import { CreateCoinOrderDto } from "../../dto";
import { PaymongoService } from "../../services/paymongo.service";
import { PayService } from "../../services/pay.service";

/**
 * Coin payment (web / H5)
 */
@ExtensionWebController("pay")
export class PayWebController extends BaseController {
    constructor(
        private readonly payService: PayService,
        private readonly paymongoService: PaymongoService,
    ) {
        super();
    }

    /**
     * Public channel info for the recharge page
     */
    @Get("config")
    @Public()
    async config() {
        const config = await this.payService.getConfig();
        return {
            enabled: Boolean(config?.enabled && config.secretKey),
            publishableKey: config?.publishableKey ?? null,
        };
    }

    /**
     * Coin tiers for the recharge page
     */
    @Get("packages")
    @Public()
    async packages() {
        return this.payService.getPackages();
    }

    /**
     * Create order + Stripe Checkout Session, return hosted checkout url
     */
    @Post("order")
    async createOrder(@Playground() user: UserPlayground, @Body() dto: CreateCoinOrderDto) {
        if (dto.channel === "paymongo") {
            return this.paymongoService.createOrder(user.id, dto);
        }
        return this.payService.createOrder(user.id, dto);
    }

    /**
     * Stripe webhook (raw body required for signature check)
     */
    @Post("webhook/stripe")
    @Public()
    async webhook(
        @Req() req: Request,
        @Headers("stripe-signature") signature: string,
    ) {
        const raw = Buffer.isBuffer(req.body)
            ? req.body
            : Buffer.from(JSON.stringify(req.body ?? {}));
        return this.payService.handleWebhook(raw, signature);
    }

    @Get("orders")
    async myOrders(
        @Playground() user: UserPlayground,
        @Query("page") page = 1,
    ) {
        return this.payService.myOrders(user.id, Number(page));
    }

    /**
     * VIP packages for the H5 VIP page
     */
    @Get("vip-packages")
    @Public()
    async vipPackages() {
        const rows = await this.payService.listVipPackages();
        return rows
            .filter((r) => r.enabled)
            .map((r) => ({
                id: r.id,
                name: r.name,
                durationType: r.durationType,
                days: r.days,
                price: r.price,
                originalPrice: r.originalPrice,
                phpPrice: r.phpPrice,
                tag: r.tag ?? "",
                autoRenew: r.autoRenew,
            }));
    }

    /**
     * Redeem a code (coin / vip reward)
     */
    @Post("redeem")
    async redeem(@Playground() user: UserPlayground, @Body("code") code: string) {
        return this.payService.redeem(user.id, code ?? "");
    }
}
