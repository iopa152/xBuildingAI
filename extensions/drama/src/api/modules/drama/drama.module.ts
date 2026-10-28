import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import { Drama } from "../../db/entities/drama.entity";
import { DramaCategory } from "../../db/entities/drama-category.entity";
import { Episode } from "../../db/entities/episode.entity";
import { DramaController } from "./controllers/console/drama.controller";
import { DramaWebController } from "./controllers/web/drama.web.controller";
import { DramaService } from "./services/drama.service";

@Module({
    imports: [TypeOrmModule.forFeature([Drama, DramaCategory, Episode])],
    controllers: [DramaController, DramaWebController],
    providers: [DramaService],
    exports: [DramaService],
})
export class DramaModule {}
