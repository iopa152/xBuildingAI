import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { ExtensionBillingModule } from "@buildingai/extension-sdk";
import { Module } from "@nestjs/common";

import {
    Faq,
    Feedback,
    WithdrawalRequest,
} from "../../db/entities/help-entities.entity";
import { HelpConsoleController } from "./controllers/console/help.console.controller";
import { HelpWebController } from "./controllers/web/help.web.controller";
import { HelpService } from "./services/help.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([WithdrawalRequest, Faq, Feedback]),
        ExtensionBillingModule,
    ],
    controllers: [HelpConsoleController, HelpWebController],
    providers: [HelpService],
    exports: [HelpService],
})
export class HelpModule {}
