import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User as UserEntity } from "@buildingai/db/entities";
import { ExtensionBillingModule } from "@buildingai/extension-sdk";
import { Module } from "@nestjs/common";

import { MemberGroup, MemberRule } from "../../db/entities/member-entities.entity";
import { MemberConsoleController } from "./controllers/console/member.console.controller";
import { MemberService } from "./services/member.service";

@Module({
    imports: [TypeOrmModule.forFeature([MemberGroup, MemberRule, UserEntity]), ExtensionBillingModule],
    controllers: [MemberConsoleController],
    providers: [MemberService],
    exports: [MemberService],
})
export class MemberModule {}
