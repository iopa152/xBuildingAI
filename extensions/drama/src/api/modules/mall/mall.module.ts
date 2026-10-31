import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { ExtensionBillingModule } from "@buildingai/extension-sdk";
import { Module } from "@nestjs/common";

import {
    MallCategory,
    MallGoods,
    MallOrder,
    MallOrderItem,
} from "../../db/entities/mall-entities.entity";
import { MallConsoleController } from "./controllers/console/mall.console.controller";
import { MallService } from "./services/mall.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([MallCategory, MallGoods, MallOrder, MallOrderItem]),
        ExtensionBillingModule,
    ],
    controllers: [MallConsoleController],
    providers: [MallService],
    exports: [MallService],
})
export class MallModule {}
