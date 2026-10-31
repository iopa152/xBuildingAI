import { EpisodeStatus } from "../../../db/entities/episode.entity";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsIn,
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
    @IsOptional()
    description?: string;

    @IsString()
    @MaxLength(1000)
    videoUrl!: string;

    @IsString()
    @MaxLength(1000)
    @IsOptional()
    thumbnail?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    duration?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    playCount?: number;

    @IsString()
    @IsOptional()
    publishTime?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    coinPrice?: number;

    @IsBoolean()
    @IsOptional()
    isFree?: boolean;

    @IsBoolean()
    @IsOptional()
    vipFree?: boolean;

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
 * Setting fields applied by the batch settings tool
 */
export class EpisodeSettingsPayloadDto {
    @IsBoolean()
    @IsOptional()
    isFree?: boolean;

    @IsInt()
    @Min(0)
    @IsOptional()
    coinPrice?: number;

    @IsBoolean()
    @IsOptional()
    vipFree?: boolean;

    @IsEnum(EpisodeStatus)
    @IsOptional()
    status?: EpisodeStatus;
}

/**
 * One episode-number range rule
 */
export class EpisodeRangeRuleDto extends EpisodeSettingsPayloadDto {
    @IsInt()
    @Min(1)
    min!: number;

    /**
     * Omitted means "to the last episode"
     */
    @IsInt()
    @Min(1)
    @IsOptional()
    max?: number;
}

/**
 * Batch settings of all episodes of a drama
 */
export class BatchEpisodeSettingsDto {
    @IsUUID("4")
    dramaId!: string;

    @IsIn(["range", "filter", "all"])
    mode!: "range" | "filter" | "all";

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EpisodeRangeRuleDto)
    @IsOptional()
    rules?: EpisodeRangeRuleDto[];

    /**
     * noPrice | free | paid | draft | published
     */
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    filters?: string[];

    @ValidateNested()
    @Type(() => EpisodeSettingsPayloadDto)
    @IsOptional()
    settings?: EpisodeSettingsPayloadDto;
}

/**
 * Query episodes of a drama
 */
export class QueryEpisodeDto {
    @IsUUID("4")
    dramaId!: string;
}
