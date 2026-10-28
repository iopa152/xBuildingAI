import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";

export class ReportProgressDto {
    @IsUUID("4")
    dramaId!: string;

    @IsUUID("4")
    episodeId!: string;

    @IsInt()
    @Min(0)
    progressSeconds!: number;
}

export class ToggleFavoriteDto {
    @IsUUID("4")
    dramaId!: string;
}

export class ToggleLikeDto {
    @IsString()
    dramaId!: string;

    /**
     * drama / episode
     */
    @IsString()
    targetType!: string;

    @IsUUID("4")
    targetId!: string;
}

export class CreateCommentDto {
    @IsUUID("4")
    dramaId!: string;

    @IsUUID("4")
    @IsOptional()
    episodeId?: string;

    @IsUUID("4")
    @IsOptional()
    parentId?: string;

    @IsString()
    @Length(1, 1000)
    content!: string;
}

export class CreateRatingDto {
    @IsUUID("4")
    dramaId!: string;

    @IsInt()
    @Min(1)
    @Max(5)
    stars!: number;
}
