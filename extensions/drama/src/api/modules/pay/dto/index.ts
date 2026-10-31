import {
    IsBoolean,
    IsIn,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Length,
    Max,
    Min,
} from "class-validator";

/**
 * Create a coin order (money → coins via Stripe Checkout / PayMongo)
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
     * Payment channel: stripe (default) or paymongo (PHP)
     */
    @IsIn(["stripe", "paymongo"])
    @IsOptional()
    channel?: string;

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
    @IsString()
    @Length(0, 100)
    @IsOptional()
    name?: string;

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

    @IsNumber()
    @Min(0)
    @IsOptional()
    originalPrice?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    phpPrice?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    phpOriginalPrice?: number;

    @IsString()
    @Length(0, 16)
    @IsOptional()
    tag?: string;

    @IsBoolean()
    @IsOptional()
    firstChargeExclusive?: boolean;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    iosProductId?: string;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    androidProductId?: string;

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
    @IsString()
    @Length(0, 100)
    @IsOptional()
    name?: string;

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

    @IsNumber()
    @Min(0)
    @IsOptional()
    originalPrice?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    phpPrice?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    phpOriginalPrice?: number;

    @IsString()
    @Length(0, 16)
    @IsOptional()
    tag?: string;

    @IsBoolean()
    @IsOptional()
    firstChargeExclusive?: boolean;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    iosProductId?: string;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    androidProductId?: string;

    @IsInt()
    @IsOptional()
    sort?: number;

    @IsBoolean()
    @IsOptional()
    enabled?: boolean;
}

/**
 * Create a VIP membership package (console)
 */
export class CreateVipPackageDto {
    @IsString()
    @Length(1, 100)
    name!: string;

    @IsString()
    @Length(1, 20)
    durationType!: string;

    @IsInt()
    @Min(1)
    @Max(3650)
    days!: number;

    @IsNumber()
    @Min(0.01)
    price!: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    originalPrice?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    phpPrice?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    phpOriginalPrice?: number;

    @IsString()
    @Length(0, 16)
    @IsOptional()
    tag?: string;

    @IsBoolean()
    @IsOptional()
    autoRenew?: boolean;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    iosProductId?: string;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    androidProductId?: string;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    googleBasePlanId?: string;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    stripePriceId?: string;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    airwallexPriceId?: string;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    paypalPlanId?: string;

    @IsInt()
    @IsOptional()
    sort?: number;

    @IsBoolean()
    @IsOptional()
    enabled?: boolean;
}

/**
 * Update a VIP membership package (console)
 */
export class UpdateVipPackageDto {
    @IsString()
    @Length(1, 100)
    @IsOptional()
    name?: string;

    @IsString()
    @Length(1, 20)
    @IsOptional()
    durationType?: string;

    @IsInt()
    @Min(1)
    @Max(3650)
    @IsOptional()
    days?: number;

    @IsNumber()
    @Min(0.01)
    @IsOptional()
    price?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    originalPrice?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    phpPrice?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    phpOriginalPrice?: number;

    @IsString()
    @Length(0, 16)
    @IsOptional()
    tag?: string;

    @IsBoolean()
    @IsOptional()
    autoRenew?: boolean;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    iosProductId?: string;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    androidProductId?: string;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    googleBasePlanId?: string;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    stripePriceId?: string;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    airwallexPriceId?: string;

    @IsString()
    @Length(0, 120)
    @IsOptional()
    paypalPlanId?: string;

    @IsInt()
    @IsOptional()
    sort?: number;

    @IsBoolean()
    @IsOptional()
    enabled?: boolean;
}

/**
 * Create a redeem code (console)
 */
export class CreateRedeemCodeDto {
    @IsString()
    @Length(1, 32)
    code!: string;

    @IsString()
    @Length(0, 40)
    @IsOptional()
    batchNo?: string;

    @IsString()
    @Length(0, 100)
    @IsOptional()
    activityName?: string;

    @IsString()
    @Length(1, 20)
    rewardType!: string;

    @IsInt()
    @Min(1)
    rewardValue!: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    maxUses?: number;

    @IsOptional()
    expireAt?: string;

    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @IsInt()
    @IsOptional()
    weight?: number;
}

/**
 * Update a redeem code (console)
 */
export class UpdateRedeemCodeDto {
    @IsString()
    @Length(1, 32)
    @IsOptional()
    code?: string;

    @IsString()
    @Length(0, 40)
    @IsOptional()
    batchNo?: string;

    @IsString()
    @Length(0, 100)
    @IsOptional()
    activityName?: string;

    @IsString()
    @Length(1, 20)
    @IsOptional()
    rewardType?: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    rewardValue?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    maxUses?: number;

    @IsOptional()
    expireAt?: string | null;

    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @IsInt()
    @IsOptional()
    weight?: number;
}

/**
 * Batch generate redeem codes (console)
 */
export class BatchGenerateRedeemCodeDto {
    @IsInt()
    @Min(1)
    @Max(500)
    count!: number;

    @IsString()
    @Length(0, 100)
    @IsOptional()
    activityName?: string;

    @IsString()
    @Length(1, 20)
    rewardType!: string;

    @IsInt()
    @Min(1)
    rewardValue!: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    maxUses?: number;

    @IsOptional()
    expireAt?: string;

    @IsInt()
    @IsOptional()
    weight?: number;
}
