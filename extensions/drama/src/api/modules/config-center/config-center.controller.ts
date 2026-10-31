import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController, ExtensionWebController } from "@buildingai/core/decorators";
import { Public } from "@buildingai/decorators/public.decorator";
import { Body, Get, Param, Post, Put } from "@nestjs/common";
import { IsArray, IsBoolean, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

import { ConfigCenterService } from "./config-center.service";

export class SaveProviderConfigDto {
    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @IsObject()
    @IsOptional()
    config?: Record<string, unknown>;

    @IsString()
    @MaxLength(300)
    @IsOptional()
    remark?: string;
}

export class ImportConfigsDto {
    @IsArray()
    rows!: {
        category: string;
        provider: string;
        enabled?: boolean;
        config?: Record<string, unknown>;
        remark?: string;
    }[];
}

/**
 * 配置中心 (console)
 */
@ExtensionConsoleController("config-center", "配置中心")
export class ConfigCenterConsoleController extends BaseController {
    constructor(private readonly service: ConfigCenterService) {
        super();
    }

    /** hub cards */
    @Get()
    summary() {
        return this.service.summary();
    }

    /** provider rows of one category */
    @Get(":category")
    listByCategory(@Param("category") category: string) {
        return this.service.listByCategory(category);
    }

    @Put(":category/:provider")
    saveProvider(
        @Param("category") category: string,
        @Param("provider") provider: string,
        @Body() dto: SaveProviderConfigDto,
    ) {
        return this.service.saveProvider(category, provider, dto);
    }

    @Post(":category/:provider/test")
    testConnection(
        @Param("category") category: string,
        @Param("provider") provider: string,
    ) {
        return this.service.testConnection(category, provider);
    }

    @Post("heat/compute")
    computeHeat() {
        return this.service.computeHeat();
    }

    @Get("export/all")
    exportAll() {
        return this.service.exportAll();
    }

    @Post("import/all")
    importAll(@Body() dto: ImportConfigsDto) {
        return this.service.importAll(dto.rows);
    }
}

/**
 * Public endpoints for the H5 side
 */
@ExtensionWebController("config-center")
export class ConfigCenterWebController extends BaseController {
    constructor(private readonly service: ConfigCenterService) {
        super();
    }

    /** customer-service entry (first enabled provider of customer_service) */
    @Get("customer-service")
    @Public()
    customerService() {
        return this.service.customerService();
    }
}
