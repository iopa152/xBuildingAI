import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { Body, Get, Post, Query } from "@nestjs/common";
import { IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

import { HelpService } from "../../services/help.service";

export class SubmitFeedbackDto {
    @IsString()
    @Length(1, 2000)
    content!: string;

    @IsString()
    @IsOptional()
    contact?: string;
}

export class ApplyWithdrawalDto {
    @IsInt()
    @Min(1)
    @Max(10000000)
    coins!: number;

    @IsString()
    @Length(1, 32)
    method!: string;

    @IsString()
    @Length(1, 200)
    account!: string;
}

/**
 * Help center + withdrawal (web / H5)
 */
@ExtensionWebController("help")
export class HelpWebController extends BaseController {
    constructor(private readonly helpService: HelpService) {
        super();
    }

    /**
     * Enabled FAQ list
     */
    @Get("faq")
    @Public()
    async faq() {
        return this.helpService.listFaqs();
    }

    @Post("feedback")
    async feedback(@Playground() user: UserPlayground, @Body() dto: SubmitFeedbackDto) {
        return this.helpService.submitFeedback(user.id, dto.content, dto.contact);
    }

    @Post("withdrawal/apply")
    async applyWithdrawal(@Playground() user: UserPlayground, @Body() dto: ApplyWithdrawalDto) {
        return this.helpService.applyWithdrawal(user.id, dto.coins, dto.method, dto.account);
    }

    @Get("withdrawal/list")
    async myWithdrawals(
        @Playground() user: UserPlayground,
        @Query("page") page = 1,
    ) {
        return this.helpService.myWithdrawals(user.id, Number(page));
    }
}
