import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import {
    BatchGenerateRedeemCodeDto,
    CreateCoinPackageDto,
    CreateRedeemCodeDto,
    CreateVipPackageDto,
    SaveStripeConfigDto,
    UpdateCoinPackageDto,
    UpdateRedeemCodeDto,
    UpdateVipPackageDto,
} from "../../dto";
import { AirwallexService } from "../../services/airwallex.service";
import { PayService } from "../../services/pay.service";

/**
 * Payment management (console)
 */
@ExtensionConsoleController("pay", "支付管理")
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
        @Query("keyword") keyword?: string,
        @Query("id") id?: string,
        @Query("username") username?: string,
        @Query("orderType") orderType?: string,
        @Query("currency") currency?: string,
        @Query("channel") channel?: string,
        @Query("market") market?: string,
        @Query("promoCode") promoCode?: string,
        @Query("pitcher") pitcher?: string,
        @Query("subscriber") subscriber?: string,
        @Query("createdFrom") createdFrom?: string,
        @Query("createdTo") createdTo?: string,
        @Query("paidFrom") paidFrom?: string,
        @Query("paidTo") paidTo?: string,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        return this.payService.listOrdersForConsole({
            status,
            userId,
            keyword,
            id,
            username,
            orderType,
            currency,
            channel,
            market,
            promoCode,
            pitcher,
            subscriber,
            createdFrom,
            createdTo,
            paidFrom,
            paidTo,
            page,
            pageSize,
        });
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

    // ---- vip packages ----

    @Get("vip-package")
    async vipPackages() {
        return this.payService.listVipPackages();
    }

    @Post("vip-package")
    async createVipPackage(@Body() dto: CreateVipPackageDto) {
        return this.payService.createVipPackage(dto);
    }

    @Patch("vip-package/:id")
    async updateVipPackage(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: UpdateVipPackageDto,
    ) {
        return this.payService.updateVipPackage(id, dto);
    }

    @Delete("vip-package/:id")
    async deleteVipPackage(@Param("id", UUIDValidationPipe) id: string) {
        return this.payService.deleteVipPackage(id);
    }

    // ---- redeem codes ----

    @Get("redeem-code")
    async redeemCodes(
        @Query("keyword") keyword?: string,
        @Query("rewardType") rewardType?: string,
        @Query("enabled") enabled?: string,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        return this.payService.listRedeemCodes({ keyword, rewardType, enabled, page, pageSize });
    }

    @Post("redeem-code")
    async createRedeemCode(@Body() dto: CreateRedeemCodeDto) {
        return this.payService.createRedeemCode(dto);
    }

    @Post("redeem-code/batch")
    async batchGenerateRedeemCodes(@Body() dto: BatchGenerateRedeemCodeDto) {
        return this.payService.batchGenerateRedeemCodes(dto);
    }

    @Patch("redeem-code/:id")
    async updateRedeemCode(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: UpdateRedeemCodeDto,
    ) {
        return this.payService.updateRedeemCode(id, dto);
    }

    @Delete("redeem-code/:id")
    async deleteRedeemCode(@Param("id", UUIDValidationPipe) id: string) {
        return this.payService.deleteRedeemCode(id);
    }

    @Get("redeem-record")
    async redeemRecords(
        @Query("keyword") keyword?: string,
        @Query("rewardType") rewardType?: string,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        return this.payService.listRedeemRecords({ keyword, rewardType, page, pageSize });
    }
}
