import { IsUUID } from "class-validator";

/**
 * Unlock a single episode
 */
export class UnlockEpisodeDto {
    @IsUUID("4")
    episodeId!: string;
}

/**
 * Unlock a whole drama
 */
export class UnlockDramaDto {
    @IsUUID("4")
    dramaId!: string;
}

/**
 * Query unlock records (console)
 */
export class QueryUnlockDto {
    @IsUUID("4")
    userId?: string;

    @IsUUID("4")
    dramaId?: string;
}
