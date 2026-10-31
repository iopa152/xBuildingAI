import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 0.5.9: PayMongo channel configuration table (Philippines PHP payments)
 */
export class PaymongoConfig1763000000008 implements MigrationInterface {
    name = "PaymongoConfig1763000000008";

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.paymongo_config (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                secret_key varchar(200) NOT NULL DEFAULT '',
                webhook_secret varchar(200) NOT NULL DEFAULT '',
                enabled boolean NOT NULL DEFAULT false,
                success_url varchar(500) NOT NULL DEFAULT '/',
                cancel_url varchar(500) NOT NULL DEFAULT '/',
                updated_at timestamptz NOT NULL DEFAULT now()
            )
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS drama.paymongo_config`);
    }
}
