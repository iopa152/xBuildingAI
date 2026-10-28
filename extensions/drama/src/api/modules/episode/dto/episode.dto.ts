import { EpisodeStatus } from "../../../db/entities/episode.entity";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
    ValidateNested,
} from "class-validator";

/**
 * Create / update a single episode
 */
export class SaveEpisodeDto {
    @IsUUID("4")
    dramaId!: string;

    @IsInt()
    @Min(1)
    episodeNo!: number;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    title?: string;

    @IsString()
    @MaxLength(1000)
    videoUrl!: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    duration?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    coinPrice?: number;

    @IsBoolean()
    @IsOptional()
    isFree?: boolean;

    @IsEnum(EpisodeStatus)
    @IsOptional()
    status?: EpisodeStatus;
}

/**
 * Batch create episodes (bulk upload)
 */
export class BatchCreateEpisodesDto {
    @IsUUID("4")
    dramaId!: string;

    /**
     * Start episode number for auto numbering
     */
    @IsInt()
    @Min(1)
    @IsOptional()
    startNo?: number;

    /**
     * Coins applied to every uploaded episode
     */
    @IsInt()
    @Min(0)
    @IsOptional()
    defaultCoinPrice?: number;

    /**
     * Mark all uploaded episodes free
     */
    @IsBoolean()
    @IsOptional()
    defaultFree?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EpisodeItemDto)
    items!: EpisodeItemDto[];
}

export class EpisodeItemDto {
    @IsString()
    @MaxLength(1000)
    videoUrl!: string;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    title?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    duration?: number;
}

/**
 * Batch set episode price
 */
export class BatchEpisodePriceDto {
    @IsArray()
    @IsUUID("4", { each: true })
    ids!: string[];

    @IsInt()
    @Min(0)
    coinPrice!: number;
}

/**
 * Query episodes of a drama
 */
export class QueryEpisodeDto {
    @IsUUID("4")
    dramaId!: string;
}
