import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Schema drift accumulated across v0.1.0 → v0.3.0 dev iterations.
 * All statements are idempotent so fresh installs and upgraded installs
 * converge to the same shape.
 */
export class DramaSchema0003 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        // v0.2.0: drama aggregates + episode likes
        await queryRunner.query(`
            ALTER TABLE drama.drama
            ADD COLUMN IF NOT EXISTS rating_avg numeric(3,1) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE drama.episode
            ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0
        `);

        // v0.3.0: task progress dedupe detail
        await queryRunner.query(`
            ALTER TABLE drama.task_record
            ADD COLUMN IF NOT EXISTS detail jsonb
        `);

        // v0.3.1: multi-channel payment
        await queryRunner.query(`
            ALTER TABLE drama.coin_order
            ADD COLUMN IF NOT EXISTS channel varchar(20) DEFAULT 'stripe'
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.airwallex_config (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "clientId" varchar(120) NOT NULL,
                "apiKey" varchar(200) NOT NULL,
                "webhookSecret" varchar(200) NOT NULL,
                enabled boolean DEFAULT false,
                "successUrl" varchar(500) DEFAULT '/',
                "cancelUrl" varchar(500) DEFAULT '/',
                "updatedAt" timestamptz DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.vod_config (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                provider varchar(20) DEFAULT 'aliyun',
                access_key_id varchar(200),
                access_key_secret varchar(200),
                region varchar(50) DEFAULT 'cn-shanghai',
                enabled boolean DEFAULT false,
                "updatedAt" timestamptz DEFAULT now()
            )
        `);

        // v0.3.0: stripe payment tables (created by synchronize on fresh
        // installs; guard for upgrades where synchronize is disabled)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.stripe_config (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "secretKey" varchar(200) NOT NULL,
                "webhookSecret" varchar(200) NOT NULL,
                "publishableKey" varchar(200),
                enabled boolean DEFAULT false,
                "successUrl" varchar(500) DEFAULT '/',
                "cancelUrl" varchar(500) DEFAULT '/',
                "updatedAt" timestamptz DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.coin_order (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "orderNo" varchar(40) NOT NULL,
                "userId" uuid NOT NULL,
                coins integer NOT NULL,
                amount integer NOT NULL,
                currency varchar(8) DEFAULT 'usd',
                status varchar(20) DEFAULT 'pending',
                "sessionId" varchar(120),
                "paymentIntentId" varchar(120),
                "promoCode" varchar(32),
                "paidAt" timestamptz,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS uq_coin_order_no ON drama.coin_order ("orderNo")`,
        );

        // v0.3.0: help center / withdrawal tables
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.withdrawal_request (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                coins integer NOT NULL,
                method varchar(32) NOT NULL,
                account varchar(200) NOT NULL,
                status varchar(20) DEFAULT 'pending',
                note varchar(255),
                "reviewedAt" timestamptz,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON drama.withdrawal_request ("userId")
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.faq (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                question varchar(255) NOT NULL,
                answer text NOT NULL,
                sort integer DEFAULT 0,
                status boolean DEFAULT true,
                "createdAt" timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.feedback (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                content varchar(2000) NOT NULL,
                contact varchar(200),
                status varchar(20) DEFAULT 'open',
                reply varchar(255),
                "createdAt" timestamp DEFAULT now()
            )
        `);
    }

    async down(): Promise<void> {
        // forward-only in dev; intentionally empty
    }
}
