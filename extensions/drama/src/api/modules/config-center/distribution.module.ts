import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import {
    DistributionBind,
    InviteCode,
    RebateLog,
    VipMembership,
} from "../../db/entities/distribution-entities.entity";
import { ThirdPartyConfig } from "../../db/entities/config-center.entity";
import { DistributionConsoleController } from "./distribution.console.controller";
import { DistributionService } from "./distribution.service";

/**
 * Distribution (invite + 3-level rebate) + drama VIP membership.
 * Depends on ConfigCenterModule for the rebate configuration.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([InviteCode, DistributionBind, RebateLog, VipMembership, ThirdPartyConfig]),
    ],
    controllers: [DistributionConsoleController],
    providers: [DistributionService],
    exports: [DistributionService],
})
export class DistributionModule {}
