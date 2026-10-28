import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * v0.4.10: promo link gains landing episode selection
 */
export class PromoLinkEpisode implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE drama.promo_link
            ADD COLUMN IF NOT EXISTS episode_id uuid
        `);
    }

    async down(): Promise<void> {
        // forward-only
    }
}
