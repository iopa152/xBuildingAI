import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import {
    Novel,
    NovelBookshelf,
    NovelCategory,
    NovelChapter,
    NovelPurchase,
    NovelRating,
    NovelReadingHistory,
} from "../../db/entities/novel-entities.entity";
import { ExtensionBillingModule } from "@buildingai/extension-sdk";

import { NovelConsoleController } from "./controllers/console/novel.console.controller";
import { NovelWebController } from "./controllers/web/novel.web.controller";
import { NovelService } from "./services/novel.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            NovelCategory,
            Novel,
            NovelChapter,
            NovelRating,
            NovelBookshelf,
            NovelReadingHistory,
            NovelPurchase,
        ]),
        ExtensionBillingModule,
    ],
    controllers: [NovelConsoleController, NovelWebController],
    providers: [NovelService],
    exports: [NovelService],
})
export class NovelModule {}
