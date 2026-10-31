import { IsOptional, IsString } from "class-validator";

/**
 * Query drama category DTO
 */
export class QueryDramaCategoryDto {
    /**
     * Category name (fuzzy)
     */
    @IsString()
    @IsOptional()
    name?: string;

    /**
     * Fuzzy keyword matched against id / name / code / language
     */
    @IsString()
    @IsOptional()
    keyword?: string;

    /**
     * Language code
     */
    @IsString()
    @IsOptional()
    language?: string;
}
