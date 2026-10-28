import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { ExtensionBillingModule } from "@buildingai/extension-sdk";
import { Module } from "@nestjs/common";

import { Drama } from "../../db/entities/drama.entity";
import { Episode } from "../../db/entities/episode.entity";
import { UnlockRecord } from "../../db/entities/unlock-record.entity";
import { UnlockConsoleController } from "./controllers/console/unlock.console.controller";
import { UnlockWebController } from "./controllers/web/unlock.web.controller";
import { UnlockService } from "./services/unlock.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([UnlockRecord, Drama, Episode]),
        ExtensionBillingModule,
    ],
    controllers: [UnlockConsoleController, UnlockWebController],
    providers: [UnlockService],
    exports: [UnlockService],
})
export class UnlockModule {}
