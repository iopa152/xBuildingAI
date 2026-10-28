import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import { Drama } from "../../db/entities/drama.entity";
import { Episode } from "../../db/entities/episode.entity";
import { EpisodeController } from "./controllers/console/episode.controller";
import { EpisodeWebController } from "./controllers/web/episode.web.controller";
import { EpisodeService } from "./services/episode.service";

@Module({
    imports: [TypeOrmModule.forFeature([Episode, Drama])],
    controllers: [EpisodeController, EpisodeWebController],
    providers: [EpisodeService],
    exports: [EpisodeService],
})
export class EpisodeModule {}
