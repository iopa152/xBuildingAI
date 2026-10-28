import {
    IsArray,
    IsBoolean,
    IsIn,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Length,
    MaxLength,
    Min,
    ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export const PROMO_LINK_STATUS = ["active", "paused", "archived"] as const;

export class PanelTierDto {
    @IsString()
    @IsIn(["vip", "coin"])
    @IsOptional()
    type?: "vip" | "coin";

    @IsString()
    @MaxLength(100)
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    vipType?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    days?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    coins?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    bonusCoins?: number;

    /** USD price in cents */
    @IsInt()
    @Min(0)
    price!: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    originalPrice?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    phpPrice?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    phpOriginalPrice?: number;

    @IsInt()
    @IsOptional()
    sort?: number;

    @IsString()
    @MaxLength(200)
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    status?: boolean;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsString()
    @IsOptional()
    badge?: string;
}

export class CreatePanelDto {
    @IsString()
    @Length(1, 100)
    name!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PanelTierDto)
    tiers!: PanelTierDto[];

    @IsBoolean()
    @IsOptional()
    status?: boolean;
}

export class UpdatePanelDto {
    @IsString()
    @Length(1, 100)
    @IsOptional()
    name?: string;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => PanelTierDto)
    tiers?: PanelTierDto[];

    @IsBoolean()
    @IsOptional()
    status?: boolean;
}

export class CreatePromoLinkDto {
    @IsString()
    @Length(2, 32)
    @IsOptional()
    code?: string;

    @IsString()
    @Length(1, 200)
    name!: string;

    @IsString()
    @MaxLength(500)
    @IsOptional()
    remark?: string;

    @IsString()
    @MaxLength(64)
    @IsOptional()
    creator?: string;

    @IsBoolean()
    @IsOptional()
    capiEnabled?: boolean;

    @IsUUID("4")
    @IsOptional()
    panelId?: string;

    @IsUUID("4")
    @IsOptional()
    pixelId?: string;

    @IsUUID("4")
    @IsOptional()
    dramaId?: string;

    @IsUUID("4")
    @IsOptional()
    episodeId?: string;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    landing?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    budget?: number;

    @IsString()
    @IsIn(PROMO_LINK_STATUS)
    @IsOptional()
    status?: string;
}

export class UpdatePromoLinkDto {
    @IsString()
    @Length(1, 100)
    @IsOptional()
    name?: string;

    @IsString()
    @MaxLength(500)
    @IsOptional()
    remark?: string;

    @IsString()
    @MaxLength(64)
    @IsOptional()
    creator?: string;

    @IsBoolean()
    @IsOptional()
    capiEnabled?: boolean;

    @IsUUID("4")
    @IsOptional()
    panelId?: string;

    @IsUUID("4")
    @IsOptional()
    pixelId?: string;

    @IsUUID("4")
    @IsOptional()
    dramaId?: string;

    @IsUUID("4")
    @IsOptional()
    episodeId?: string;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    landing?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    budget?: number;

    @IsString()
    @IsIn(PROMO_LINK_STATUS)
    @IsOptional()
    status?: string;
}

export class CreatePixelDto {
    @IsString()
    @Length(1, 100)
    name!: string;

    @IsString()
    @Length(4, 100)
    pixelId!: string;

    @IsString()
    @IsOptional()
    platform?: string;

    @IsString()
    @IsOptional()
    accessToken?: string;

    @IsBoolean()
    @IsOptional()
    status?: boolean;
}

export class UpdatePixelDto {
    @IsString()
    @Length(1, 100)
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    pixelId?: string;

    @IsString()
    @IsOptional()
    accessToken?: string;

    @IsBoolean()
    @IsOptional()
    status?: boolean;
}
