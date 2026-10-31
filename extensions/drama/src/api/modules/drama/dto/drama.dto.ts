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
    @MaxLength(255)
    @IsOptional()
    subtitle?: string;

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

    /**
     * Content type: 1 live-action, 2 anime, 3 AI generated
     */
    @IsInt()
    @Min(1)
    @IsOptional()
    contentType?: number;

    @IsBoolean()
    @IsOptional()
    complete?: boolean;

    @IsBoolean()
    @IsOptional()
    featured?: boolean;

    @IsBoolean()
    @IsOptional()
    hot?: boolean;

    @IsBoolean()
    @IsOptional()
    isNew?: boolean;

    @IsBoolean()
    @IsOptional()
    rising?: boolean;

    @IsBoolean()
    @IsOptional()
    vipOnly?: boolean;

    @IsBoolean()
    @IsOptional()
    exclusive?: boolean;

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
    viewCount?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    likeCount?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    episodeCount?: number;

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
    @MaxLength(255)
    @IsOptional()
    subtitle?: string;

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

    @IsInt()
    @Min(1)
    @IsOptional()
    contentType?: number;

    @IsBoolean()
    @IsOptional()
    complete?: boolean;

    @IsBoolean()
    @IsOptional()
    featured?: boolean;

    @IsBoolean()
    @IsOptional()
    hot?: boolean;

    @IsBoolean()
    @IsOptional()
    isNew?: boolean;

    @IsBoolean()
    @IsOptional()
    rising?: boolean;

    @IsBoolean()
    @IsOptional()
    vipOnly?: boolean;

    @IsBoolean()
    @IsOptional()
    exclusive?: boolean;

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
    viewCount?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    likeCount?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    episodeCount?: number;

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
