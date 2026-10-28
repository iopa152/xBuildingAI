import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { ExtensionBillingModule } from "@buildingai/extension-sdk";
import { Module } from "@nestjs/common";

import { User as UserEntity, UserSubscription } from "@buildingai/db/entities";
import { CoinOrder } from "../../db/entities/pay-entities.entity";
import { UnlockRecord } from "../../db/entities/unlock-record.entity";
import { WatchHistory } from "../../db/entities/watch-entities.entity";
import { StatsConsoleController, MemberConsoleController } from "./controllers/stats.controller";
import { MemberService, StatsService } from "./services/stats.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([CoinOrder, UnlockRecord, WatchHistory, UserEntity, UserSubscription]),
        ExtensionBillingModule,
    ],
    controllers: [StatsConsoleController, MemberConsoleController],
    providers: [StatsService, MemberService],
    exports: [StatsService, MemberService],
})
export class StatsModule {}
