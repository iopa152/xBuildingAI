import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * v0.4.11: coin recharge packages become data-driven
 */
export class CoinPackageTable implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.coin_package (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                coins integer NOT NULL,
                bonus integer DEFAULT 0,
                price numeric(10,2) NOT NULL,
                tag varchar(16),
                sort integer DEFAULT 0,
                enabled boolean DEFAULT true,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS uq_coin_package_coins ON drama.coin_package (coins)
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_coin_package_sort ON drama.coin_package (sort)
        `);
    }

    async down(): Promise<void> {
        // forward-only
    }
}
