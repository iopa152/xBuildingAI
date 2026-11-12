import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 0.7.0: distribution (invite + 3-level rebate) and drama-scoped VIP membership.
 * Also adds a coin price column to vip_package for coin purchases.
 */
export class Distribution1763000000012 implements MigrationInterface {
    name = "Distribution1763000000012";

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.invite_code (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                code varchar(16) NOT NULL,
                user_id uuid NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT uq_invite_code_code UNIQUE (code),
                CONSTRAINT uq_invite_code_user UNIQUE (user_id)
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.distribution_bind (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                inviter_id uuid NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT uq_distribution_bind_user UNIQUE (user_id)
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.rebate_log (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                from_user_id uuid NOT NULL,
                level int NOT NULL,
                coins int NOT NULL DEFAULT 0,
                order_no varchar(64),
                created_at timestamptz NOT NULL DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_rebate_beneficiary
                ON drama.rebate_log (user_id, created_at DESC)
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.vip_membership (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                package_id uuid NOT NULL,
                start_time timestamptz NOT NULL DEFAULT now(),
                end_time timestamptz NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT uq_vip_membership_user UNIQUE (user_id)
            )
        `);
        await queryRunner.query(`
            ALTER TABLE drama.vip_package
                ADD COLUMN IF NOT EXISTS coin_price int DEFAULT 0
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS drama.rebate_log`);
        await queryRunner.query(`DROP TABLE IF EXISTS drama.distribution_bind`);
        await queryRunner.query(`DROP TABLE IF EXISTS drama.invite_code`);
        await queryRunner.query(`DROP TABLE IF EXISTS drama.vip_membership`);
        await queryRunner.query(`ALTER TABLE drama.vip_package DROP COLUMN IF EXISTS coin_price`);
    }
}
