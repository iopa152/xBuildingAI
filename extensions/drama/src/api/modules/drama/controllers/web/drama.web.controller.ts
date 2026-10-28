import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { Public } from "@buildingai/decorators/public.decorator";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Get, Param, Query } from "@nestjs/common";

import { QueryDramaDto } from "../../dto";
import { DramaService } from "../../services/drama.service";

/**
 * Drama (web / H5)
 */
@ExtensionWebController("drama")
export class DramaWebController extends BaseController {
    constructor(private readonly dramaService: DramaService) {
        super();
    }

    /**
     * Published drama list: filters + order (heat/new/views)
     */
    @Get("list")
    @Public()
    async list(@Query() dto: QueryDramaDto) {
        return this.dramaService.list({ ...dto, status: "published" as never });
    }

    /**
     * Vertical feed of published episodes (theater)
     */
    @Get("feed")
    @Public()
    async feed(@Query("cursor") cursor?: string, @Query("pageSize") pageSize = 10) {
        return this.dramaService.feed(cursor, Number(pageSize));
    }

    /**
     * Drama detail with published episodes; counts a view
     */
    @Get("detail/:id")
    @Public()
    async detail(@Param("id", UUIDValidationPipe) id: string) {
        const drama = await this.dramaService.findDramaById(id);
        await this.dramaService.incrementViewCount(id);
        return drama;
    }
}
