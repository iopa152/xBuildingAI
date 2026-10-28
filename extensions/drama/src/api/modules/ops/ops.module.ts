import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import { Drama } from "../../db/entities/drama.entity";
import { DramaConfig, DramaLanguage, DramaPlaylist } from "../../db/entities/ops-entities.entity";
import { OpsConsoleController, OpsWebController } from "./controllers/ops.controller";
import { OpsService } from "./services/ops.service";

@Module({
    imports: [TypeOrmModule.forFeature([DramaPlaylist, DramaLanguage, DramaConfig, Drama])],
    controllers: [OpsConsoleController, OpsWebController],
    providers: [OpsService],
    exports: [OpsService],
})
export class OpsModule {}
