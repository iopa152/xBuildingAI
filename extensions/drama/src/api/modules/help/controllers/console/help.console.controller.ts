import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";

import { HelpService } from "../../services/help.service";

export class CreateFaqDto {
    @IsString()
    question!: string;

    @IsString()
    answer!: string;

    @IsOptional()
    sort?: number;

    @IsOptional()
    status?: boolean;
}

/**
 * Help center + withdrawal management (console)
 */
@ExtensionConsoleController("help", "帮助与提现管理")
export class HelpConsoleController extends BaseController {
    constructor(private readonly helpService: HelpService) {
        super();
    }

    // ---- FAQ ----

    @Get("faq")
    async faqs() {
        return this.helpService.listFaqsForConsole();
    }

    @Post("faq")
    async createFaq(@Body() dto: CreateFaqDto) {
        return this.helpService.createFaq(dto);
    }

    @Patch("faq/:id")
    async updateFaq(@Param("id", UUIDValidationPipe) id: string, @Body() dto: CreateFaqDto) {
        await this.helpService.updateFaq(id, dto);
        return { success: true };
    }

    @Delete("faq/:id")
    async deleteFaq(@Param("id", UUIDValidationPipe) id: string) {
        await this.helpService.deleteFaq(id);
        return { success: true };
    }

    // ---- feedback ----

    @Get("feedback")
    async feedbacks(
        @Query("status") status?: string,
        @Query("page") page?: number,
    ) {
        return this.helpService.listFeedbackForConsole({ status, page });
    }

    @Post("feedback/:id/resolve")
    async resolveFeedback(
        @Param("id", UUIDValidationPipe) id: string,
        @Body("reply") reply?: string,
    ) {
        await this.helpService.resolveFeedback(id, reply);
        return { success: true };
    }

    // ---- withdrawal ----

    @Get("withdrawal")
    async withdrawals(
        @Query("status") status?: string,
        @Query("page") page?: number,
    ) {
        return this.helpService.listWithdrawalsForConsole({ status, page });
    }

    @Post("withdrawal/:id/approve")
    async approve(
        @Param("id", UUIDValidationPipe) id: string,
        @Body("note") note?: string,
    ) {
        return this.helpService.approve(id, note);
    }

    @Post("withdrawal/:id/reject")
    async reject(
        @Param("id", UUIDValidationPipe) id: string,
        @Body("note") note?: string,
    ) {
        return this.helpService.reject(id, note);
    }
}
