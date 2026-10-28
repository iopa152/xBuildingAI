import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { CreateCoinPackageDto, SaveStripeConfigDto, UpdateCoinPackageDto } from "../../dto";
import { AirwallexService } from "../../services/airwallex.service";
import { PayService } from "../../services/pay.service";

/**
 * Coin payment management (console)
 */
@ExtensionConsoleController("pay", "金币充值管理")
export class PayConsoleController extends BaseController {
    constructor(
        private readonly payService: PayService,
        private readonly airwallexService: AirwallexService,
    ) {
        super();
    }

    @Get("config")
    async getConfig() {
        const config = await this.payService.getConfig();
        if (!config) return null;
        // never echo full secrets back to the browser
        return {
            enabled: config.enabled,
            successUrl: config.successUrl,
            cancelUrl: config.cancelUrl,
            secretKeyMasked: config.secretKey ? `${config.secretKey.slice(0, 7)}***` : null,
            webhookSecretMasked: config.webhookSecret
                ? `${config.webhookSecret.slice(0, 6)}***`
                : null,
        };
    }

    @Post("config")
    async saveConfig(@Body() dto: SaveStripeConfigDto) {
        await this.payService.saveConfig(dto);
        return { success: true, message: "保存成功" };
    }

    // ---- coin packages ----

    @Get("package")
    async packages() {
        return this.payService.listPackages();
    }

    @Post("package")
    async createPackage(@Body() dto: CreateCoinPackageDto) {
        return this.payService.createPackage(dto);
    }

    @Patch("package/:id")
    async updatePackage(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: UpdateCoinPackageDto,
    ) {
        return this.payService.updatePackage(id, dto);
    }

    @Delete("package/:id")
    async deletePackage(@Param("id", UUIDValidationPipe) id: string) {
        return this.payService.deletePackage(id);
    }

    @Get("order")
    async orders(
        @Query("status") status?: string,
        @Query("userId") userId?: string,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        return this.payService.listOrdersForConsole({ status, userId, page, pageSize });
    }

    @Post("order/:id/refund")
    async refund(@Param("id", UUIDValidationPipe) id: string) {
        // dispatch by order channel
        const orders = await this.payService.listOrdersForConsole({ page: 1, pageSize: 1000 });
        const order = orders.items.find((o) => o.id === id);
        if (order?.channel === "airwallex") {
            return this.airwallexService.refund(id);
        }
        return this.payService.refund(id);
    }
}
