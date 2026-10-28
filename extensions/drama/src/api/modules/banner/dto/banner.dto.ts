import { BannerLinkType } from "../../../db/entities/banner.entity";
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, MaxLength, Min } from "class-validator";

/**
 * Create banner DTO
 */
export class CreateBannerDto {
    @IsString()
    @Length(1, 100)
    title!: string;

    @IsString()
    @MaxLength(500)
    image!: string;

    @IsEnum(BannerLinkType)
    @IsOptional()
    linkType?: BannerLinkType;

    @IsUUID("4")
    @IsOptional()
    dramaId?: string;

    @IsString()
    @MaxLength(1000)
    @IsOptional()
    url?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    sort?: number;

    @IsBoolean()
    @IsOptional()
    status?: boolean;

    @IsDateString()
    @IsOptional()
    startTime?: string;

    @IsDateString()
    @IsOptional()
    endTime?: string;
}

/**
 * Update banner DTO
 */
export class UpdateBannerDto {
    @IsString()
    @Length(1, 100)
    @IsOptional()
    title?: string;

    @IsString()
    @MaxLength(500)
    @IsOptional()
    image?: string;

    @IsEnum(BannerLinkType)
    @IsOptional()
    linkType?: BannerLinkType;

    @IsUUID("4")
    @IsOptional()
    dramaId?: string;

    @IsString()
    @MaxLength(1000)
    @IsOptional()
    url?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    sort?: number;

    @IsBoolean()
    @IsOptional()
    status?: boolean;

    @IsDateString()
    @IsOptional()
    startTime?: string;

    @IsDateString()
    @IsOptional()
    endTime?: string;
}

/**
 * Query banner DTO
 */
export class QueryBannerDto {
    @IsString()
    @IsOptional()
    title?: string;
}
