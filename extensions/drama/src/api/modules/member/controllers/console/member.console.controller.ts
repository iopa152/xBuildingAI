import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { MemberService } from "../../services/member.service";

/**
 * Member groups / rules / points management
 */
@ExtensionConsoleController("member-manage", "会员分组与积分")
export class MemberConsoleController extends BaseController {
    constructor(private readonly memberService: MemberService) {
        super();
    }

    @Get("group")
    async groups() {
        return this.memberService.listGroups();
    }

    @Post("group")
    async createGroup(@Body() body: { name: string; rules?: string[]; status?: boolean; sort?: number }) {
        return this.memberService.createGroup(body);
    }

    @Patch("group/:id")
    async updateGroup(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() body: { name?: string; rules?: string[]; status?: boolean; sort?: number },
    ) {
        return this.memberService.updateGroup(id, body);
    }

    @Delete("group/:id")
    async deleteGroup(@Param("id", UUIDValidationPipe) id: string) {
        return this.memberService.deleteGroup(id);
    }

    @Get("rule")
    async rules() {
        return this.memberService.listRules();
    }

    @Post("rule")
    async createRule(
        @Body() body: { title: string; path?: string; icon?: string; sort?: number; status?: boolean },
    ) {
        return this.memberService.createRule(body);
    }

    @Patch("rule/:id")
    async updateRule(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() body: { title?: string; path?: string; icon?: string; sort?: number; status?: boolean },
    ) {
        return this.memberService.updateRule(id, body);
    }

    @Delete("rule/:id")
    async deleteRule(@Param("id", UUIDValidationPipe) id: string) {
        return this.memberService.deleteRule(id);
    }

    @Get("score")
    async scoreLogs(
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
        @Query("userId") userId?: string,
        @Query("keyword") keyword?: string,
    ) {
        return this.memberService.scoreLogs({ page, pageSize, userId, keyword });
    }

    @Get("score/user/:id")
    async memberInfo(@Param("id", UUIDValidationPipe) id: string) {
        return this.memberService.memberInfo(id);
    }

    @Post("score/:id/adjust")
    async adjust(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() body: { delta: number; memo?: string },
    ) {
        return this.memberService.adjustScore(id, Number(body.delta), body.memo);
    }
}
