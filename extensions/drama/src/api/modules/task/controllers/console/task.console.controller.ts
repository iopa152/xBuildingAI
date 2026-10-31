import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { CreateTaskConfigDto, UpdateTaskConfigDto } from "../../dto";
import { TaskService } from "../../services/task.service";

/**
 * Task configuration & records (console)
 */
@ExtensionConsoleController("task", "签到任务管理")
export class TaskConsoleController extends BaseController {
    constructor(private readonly taskService: TaskService) {
        super();
    }

    @Get("config")
    async listConfigs() {
        return this.taskService.listConfigs();
    }

    @Post("config")
    async createConfig(@Body() dto: CreateTaskConfigDto) {
        return this.taskService.createConfig(dto);
    }

    @Patch("config/:id")
    async updateConfig(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: UpdateTaskConfigDto,
    ) {
        await this.taskService.updateConfig(id, dto);
        return { success: true, message: "更新成功" };
    }

    @Delete("config/:id")
    async deleteConfig(@Param("id", UUIDValidationPipe) id: string) {
        await this.taskService.deleteConfig(id);
        return { success: true, message: "删除成功" };
    }

    @Get("record")
    async listRecords(
        @Query("taskCode") taskCode?: string,
        @Query("page") page?: number,
        @Query("rewarded") rewarded?: string,
    ) {
        return this.taskService.listRecords({ taskCode, page, rewarded });
    }

    @Get("checkin")
    async listCheckins(
        @Query("userId") userId?: string,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        return this.taskService.listCheckins({ userId, page, pageSize });
    }
}
