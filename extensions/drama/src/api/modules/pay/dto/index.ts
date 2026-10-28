import {
    IsBoolean,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Length,
    Max,
    Min,
} from "class-validator";

/**
 * Create a coin order (money → coins via Stripe Checkout)
 */
export class CreateCoinOrderDto {
    @IsInt()
    @Min(1)
    @Max(1000000)
    coins!: number;

    /**
     * Price in major currency units, e.g. 0.99
     */
    @Min(0.01)
    price!: number;

    @IsString()
    @Length(2, 8)
    @IsOptional()
    currency?: string;

    /**
     * Promo code context (for CAPI / LTV attribution)
     */
    @IsString()
    @Length(1, 32)
    @IsOptional()
    promoCode?: string;
}

/**
 * Save stripe channel config (console)
 */
export class SaveStripeConfigDto {
    @IsString()
    @Length(4, 200)
    @IsOptional()
    secretKey?: string;

    @IsString()
    @Length(4, 200)
    @IsOptional()
    webhookSecret?: string;

    @IsString()
    @IsOptional()
    publishableKey?: string;

    @IsOptional()
    enabled?: boolean;

    @IsString()
    @IsOptional()
    successUrl?: string;

    @IsString()
    @IsOptional()
    cancelUrl?: string;
}

/**
 * Create a coin recharge tier (console)
 */
export class CreateCoinPackageDto {
    @IsInt()
    @Min(1)
    @Max(10000000)
    coins!: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    bonus?: number;

    @IsNumber()
    @Min(0.01)
    price!: number;

    @IsString()
    @Length(0, 16)
    @IsOptional()
    tag?: string;

    @IsInt()
    @IsOptional()
    sort?: number;

    @IsBoolean()
    @IsOptional()
    enabled?: boolean;
}

/**
 * Update a coin recharge tier (console)
 */
export class UpdateCoinPackageDto {
    @IsInt()
    @Min(1)
    @Max(10000000)
    @IsOptional()
    coins?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    bonus?: number;

    @IsNumber()
    @Min(0.01)
    @IsOptional()
    price?: number;

    @IsString()
    @Length(0, 16)
    @IsOptional()
    tag?: string;

    @IsInt()
    @IsOptional()
    sort?: number;

    @IsBoolean()
    @IsOptional()
    enabled?: boolean;
}
