import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { Body, Get, Post } from "@nestjs/common";

import { TaskService } from "../../services/task.service";

/**
 * Check-in & tasks (web / H5)
 */
@ExtensionWebController("task")
export class TaskWebController extends BaseController {
    constructor(private readonly taskService: TaskService) {
        super();
    }

    @Get("checkin/status")
    async checkinStatus(@Playground() user: UserPlayground) {
        return this.taskService.checkinStatus(user.id);
    }

    @Post("checkin/do")
    async checkin(@Playground() user: UserPlayground) {
        return this.taskService.checkin(user.id);
    }

    /**
     * Task list with the caller's progress (requires login)
     */
    @Get("list")
    async list(@Playground() user: UserPlayground) {
        return this.taskService.taskList(user.id);
    }

    /**
     * Public task catalog (guest view, zero progress)
     */
    @Get("configs")
    @Public()
    async configs() {
        return this.taskService.taskList();
    }

    @Post("claim")
    async claim(@Playground() user: UserPlayground, @Body("code") code: string) {
        return this.taskService.claim(user.id, code);
    }
}
