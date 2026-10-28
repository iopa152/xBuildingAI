import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { ExtensionBillingModule } from "@buildingai/extension-sdk";
import { Module } from "@nestjs/common";

import { CheckinRecord, TaskConfig, TaskRecord } from "../../db/entities/task-entities.entity";
import { OpsModule } from "../ops/ops.module";
import { TaskConsoleController } from "./controllers/console/task.console.controller";
import { TaskWebController } from "./controllers/web/task.web.controller";
import { TaskService, TaskTriggerService } from "./services/task.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([CheckinRecord, TaskConfig, TaskRecord]),
        ExtensionBillingModule,
        OpsModule,
    ],
    controllers: [TaskConsoleController, TaskWebController],
    providers: [TaskService, TaskTriggerService],
    exports: [TaskService, TaskTriggerService],
})
export class TaskModule {}
