import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { Get, Query } from "@nestjs/common";

import { QueryUnlockDto } from "../../dto";
import { UnlockService } from "../../services/unlock.service";

/**
 * Unlock records (console)
 */
@ExtensionConsoleController("unlock", "解锁记录")
export class UnlockConsoleController extends BaseController {
    constructor(private readonly unlockService: UnlockService) {
        super();
    }

    @Get()
    async list(@Query() dto: QueryUnlockDto & { page?: number; pageSize?: number }) {
        return this.unlockService.listForConsole(dto);
    }

    @Get("stats")
    async stats() {
        return this.unlockService.stats();
    }
}
