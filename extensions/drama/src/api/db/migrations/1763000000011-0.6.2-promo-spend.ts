import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 0.6.2: manual ad-spend per promo link/day for ROI analytics
 */
export class PromoSpend1763000000011 implements MigrationInterface {
    name = "PromoSpend1763000000011";

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE drama.promo_daily
                ADD COLUMN IF NOT EXISTS spend numeric(12,2) DEFAULT 0
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE drama.promo_daily
                DROP COLUMN IF EXISTS spend
        `);
    }
}
