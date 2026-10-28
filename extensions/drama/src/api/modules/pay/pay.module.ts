import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { ExtensionBillingModule } from "@buildingai/extension-sdk";
import { Module } from "@nestjs/common";

import { AirwallexConfig } from "../../db/entities/airwallex-config.entity";
import { CoinOrder, CoinPackage, StripeConfig } from "../../db/entities/pay-entities.entity";
import { PromotionModule } from "../promotion/promotion.module";
import { AirwallexConsoleController, AirwallexWebController } from "./controllers/airwallex.controller";
import { PayConsoleController } from "./controllers/console/pay.console.controller";
import { PayWebController } from "./controllers/web/pay.web.controller";
import { AirwallexService } from "./services/airwallex.service";
import { PayService } from "./services/pay.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([CoinOrder, CoinPackage, StripeConfig, AirwallexConfig]),
        ExtensionBillingModule,
        PromotionModule,
    ],
    controllers: [
        PayConsoleController,
        PayWebController,
        AirwallexWebController,
        AirwallexConsoleController,
    ],
    providers: [PayService, AirwallexService],
    exports: [PayService, AirwallexService],
})
export class PayModule {}
