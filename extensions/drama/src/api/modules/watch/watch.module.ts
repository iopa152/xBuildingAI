import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { Comment, Rating } from "../../db/entities/comment-entities.entity";
import { Drama } from "../../db/entities/drama.entity";
import { Episode } from "../../db/entities/episode.entity";
import { Favorite, LikeRecord, WatchHistory } from "../../db/entities/watch-entities.entity";
import { TaskModule } from "../task/task.module";
import { WatchConsoleController } from "./controllers/console/watch.console.controller";
import { WatchWebController } from "./controllers/web/watch.web.controller";
import { WatchService } from "./services/watch.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            WatchHistory,
            Favorite,
            LikeRecord,
            Comment,
            Rating,
            Drama,
            Episode,
            User,
        ]),
        TaskModule,
    ],
    controllers: [WatchConsoleController, WatchWebController],
    providers: [WatchService],
    exports: [WatchService],
})
export class WatchModule {}
