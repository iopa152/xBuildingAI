import { PaginationDto } from "@buildingai/dto";
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

import { DramaStatus } from "../../../db/entities/drama.entity";

/**
 * Drama list sort options
 */
export enum DramaOrder {
    HEAT = "heat",
    NEW = "new",
    VIEWS = "views",
}

/**
 * Query drama list DTO (console + web share it)
 */
export class QueryDramaDto extends PaginationDto {
    /**
     * Title fuzzy search
     */
    @IsString()
    @IsOptional()
    title?: string;

    /**
     * Publish status
     */
    @IsEnum(DramaStatus)
    @IsOptional()
    status?: DramaStatus;

    /**
     * Finished airing
     */
    @IsBoolean()
    @IsOptional()
    complete?: boolean;

    /**
     * Featured only
     */
    @IsBoolean()
    @IsOptional()
    featured?: boolean;

    /**
     * Language code
     */
    @IsString()
    @IsOptional()
    language?: string;

    /**
     * Category id filter
     */
    @IsUUID("4")
    @IsOptional()
    categoryId?: string;

    /**
     * Sort: heat / new / views
     */
    @IsString()
    @IsOptional()
    order?: string;
}
