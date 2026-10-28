import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import { Banner } from "../../db/entities/banner.entity";
import { BannerController } from "./controllers/console/banner.controller";
import { BannerWebController } from "./controllers/web/banner.web.controller";
import { BannerService } from "./services/banner.service";

@Module({
    imports: [TypeOrmModule.forFeature([Banner])],
    controllers: [BannerController, BannerWebController],
    providers: [BannerService],
    exports: [BannerService],
})
export class BannerModule {}
