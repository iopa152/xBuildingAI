import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * v0.4.4: promo link gains 投手 display name and CAPI toggle
 */
export class PromoLinkColumns implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE drama.promo_link
            ADD COLUMN IF NOT EXISTS creator varchar(64) DEFAULT 'Admin',
            ADD COLUMN IF NOT EXISTS capi_enabled boolean DEFAULT true
        `);
    }

    async down(): Promise<void> {
        // forward-only
    }
}
