import { IsBoolean, IsInt, IsOptional, IsString, Length, MaxLength, Min } from "class-validator";

/**
 * Create drama category DTO
 */
export class CreateDramaCategoryDto {
    /**
     * Category name
     */
    @IsString()
    @Length(1, 100, { message: "分类名称长度 1-100" })
    name!: string;

    /**
     * Category code (slug)
     */
    @IsString()
    @Length(1, 100, { message: "分类标识长度 1-100" })
    code!: string;

    /**
     * Language code
     */
    @IsString()
    @MaxLength(16)
    @IsOptional()
    language?: string;

    /**
     * Icon url
     */
    @IsString()
    @IsOptional()
    icon?: string;

    /**
     * Description
     */
    @IsString()
    @IsOptional()
    description?: string;

    /**
     * Sort order
     */
    @IsInt()
    @Min(0)
    @IsOptional()
    sort?: number;

    /**
     * Enabled status
     */
    @IsBoolean()
    @IsOptional()
    status?: boolean;
}
