import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import {
    Attribution,
    CapiEvent,
    ClickLog,
    Pixel,
    PricePanel,
    PromoDaily,
    PromoLink,
} from "../../db/entities/promotion-entities.entity";
import { CoinOrder } from "../../db/entities/pay-entities.entity";
import { Episode } from "../../db/entities/episode.entity";
import { UnlockRecord } from "../../db/entities/unlock-record.entity";
import { PromotionConsoleController } from "./controllers/console/promotion.console.controller";
import { PromotionWebController } from "./controllers/web/promotion.web.controller";
import { PromotionService } from "./services/promotion.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            PromoLink,
            PricePanel,
            ClickLog,
            Attribution,
            Pixel,
            CapiEvent,
            PromoDaily,
            UnlockRecord,
            CoinOrder,
            Episode,
        ]),
    ],
    controllers: [PromotionConsoleController, PromotionWebController],
    providers: [PromotionService],
    exports: [PromotionService],
})
export class PromotionModule {}
