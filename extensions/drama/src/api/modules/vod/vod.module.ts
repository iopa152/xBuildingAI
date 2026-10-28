import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import { VodConfig } from "../../db/entities/vod-config.entity";
import { VodConsoleController, VodWebController } from "./controllers/vod.controller";
import { VodService } from "./services/vod.service";

@Module({
    imports: [TypeOrmModule.forFeature([VodConfig])],
    controllers: [VodConsoleController, VodWebController],
    providers: [VodService],
    exports: [VodService],
})
export class VodModule {}
