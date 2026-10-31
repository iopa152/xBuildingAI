import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User as UserEntity } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { AdminLog } from "../../db/entities/member-entities.entity";
import { SystemConsoleController } from "./controllers/console/system.console.controller";
import { SystemService } from "./services/system.service";

@Module({
    imports: [TypeOrmModule.forFeature([AdminLog, UserEntity])],
    controllers: [SystemConsoleController],
    providers: [SystemService],
    exports: [SystemService],
})
export class SystemModule {}
