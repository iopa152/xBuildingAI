import { IsBoolean, IsInt, IsOptional, IsString, Length, MaxLength, Min } from "class-validator";

/**
 * Update drama category DTO
 */
export class UpdateDramaCategoryDto {
    @IsString()
    @Length(1, 100)
    @IsOptional()
    name?: string;

    @IsString()
    @Length(1, 100)
    @IsOptional()
    code?: string;

    @IsString()
    @MaxLength(16)
    @IsOptional()
    language?: string;

    @IsString()
    @IsOptional()
    icon?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    sort?: number;

    @IsBoolean()
    @IsOptional()
    status?: boolean;
}
