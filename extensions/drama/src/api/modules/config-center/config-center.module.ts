import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import { AirwallexConfig } from "../../db/entities/airwallex-config.entity";
import { ThirdPartyConfig } from "../../db/entities/config-center.entity";
import { PaymongoConfig } from "../../db/entities/paymongo-config.entity";
import { StripeConfig } from "../../db/entities/pay-entities.entity";
import { VodConfig } from "../../db/entities/vod-config.entity";
import { Drama } from "../../db/entities/drama.entity";
import { ConfigCenterConsoleController, ConfigCenterWebController } from "./config-center.controller";
import { ConfigCenterService } from "./config-center.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ThirdPartyConfig,
            VodConfig,
            StripeConfig,
            AirwallexConfig,
            PaymongoConfig,
            Drama,
        ]),
    ],
    controllers: [ConfigCenterConsoleController, ConfigCenterWebController],
    providers: [ConfigCenterService],
    exports: [ConfigCenterService],
})
export class ConfigCenterModule {}
