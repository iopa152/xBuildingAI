import { DramaStatus } from "../../../db/entities/drama.entity";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Length,
    MaxLength,
    Min,
} from "class-validator";

/**
 * Create drama DTO
 */
export class CreateDramaDto {
    @IsString()
    @Length(1, 255, { message: "剧目标题长度 1-255" })
    title!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @MaxLength(16)
    @IsOptional()
    language?: string;

    @IsString()
    @IsOptional()
    coverVertical?: string;

    @IsString()
    @IsOptional()
    coverHorizontal?: string;

    @IsEnum(DramaStatus)
    @IsOptional()
    status?: DramaStatus;

    @IsBoolean()
    @IsOptional()
    complete?: boolean;

    @IsBoolean()
    @IsOptional()
    featured?: boolean;

    @IsInt()
    @Min(0)
    @IsOptional()
    wholePrice?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    heat?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    sort?: number;

    /**
     * Category ids
     */
    @IsArray()
    @IsUUID("4", { each: true })
    @IsOptional()
    categoryIds?: string[];
}

/**
 * Update drama DTO
 */
export class UpdateDramaDto {
    @IsString()
    @Length(1, 255)
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @MaxLength(16)
    @IsOptional()
    language?: string;

    @IsString()
    @IsOptional()
    coverVertical?: string;

    @IsString()
    @IsOptional()
    coverHorizontal?: string;

    @IsEnum(DramaStatus)
    @IsOptional()
    status?: DramaStatus;

    @IsBoolean()
    @IsOptional()
    complete?: boolean;

    @IsBoolean()
    @IsOptional()
    featured?: boolean;

    @IsInt()
    @Min(0)
    @IsOptional()
    wholePrice?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    heat?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    sort?: number;

    @IsArray()
    @IsUUID("4", { each: true })
    @IsOptional()
    categoryIds?: string[];
}

/**
 * Batch set whole-drama price DTO
 */
export class BatchSetPriceDto {
    @IsArray()
    @IsUUID("4", { each: true })
    ids!: string[];

    @IsInt()
    @Min(0)
    wholePrice!: number;
}
