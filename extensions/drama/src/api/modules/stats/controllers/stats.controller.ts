import { BaseController } from "@buildingai/base";
import {
    ExtensionConsoleController,
    ExtensionWebController,
} from "@buildingai/core/decorators";
import { Public } from "@buildingai/decorators/public.decorator";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Get, Param, Post, Query } from "@nestjs/common";
import { IsInt, IsOptional, IsString, MaxLength } from "class-validator";

import { MemberService, StatsService } from "../services/stats.service";

export class AdjustCoinsDto {
    /**
     * Positive to credit, negative to debit
     */
    @IsInt()
    delta!: number;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    remark?: string;
}

/**
 * Dashboard statistics (console)
 */
@ExtensionConsoleController("stats", "数据看板")
export class StatsConsoleController extends BaseController {
    constructor(private readonly statsService: StatsService) {
        super();
    }

    @Get("overview")
    async overview(
        @Query("start_date") startDate?: string,
        @Query("end_date") endDate?: string,
    ) {
        return this.statsService.overview({ startDate, endDate });
    }
}

/**
 * Member management (console)
 */
@ExtensionConsoleController("member", "会员管理")
export class MemberConsoleController extends BaseController {
    constructor(private readonly memberService: MemberService) {
        super();
    }

    @Get()
    async list(
        @Query("keyword") keyword?: string,
        @Query("vip") vip?: string,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        return this.memberService.list({
            keyword,
            vip: vip === "true" ? true : vip === "false" ? false : undefined,
            page: page ? Number(page) : undefined,
            pageSize: pageSize ? Number(pageSize) : undefined,
        });
    }

    @Post(":id/coins")
    async adjustCoins(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: AdjustCoinsDto,
    ) {
        return this.memberService.adjustCoins("console", id, dto.delta, dto.remark);
    }

    @Post(":id/status")
    async setStatus(@Param("id", UUIDValidationPipe) id: string, @Body("status") status: number) {
        return this.memberService.setStatus(id, Number(status) || 0);
    }
}
