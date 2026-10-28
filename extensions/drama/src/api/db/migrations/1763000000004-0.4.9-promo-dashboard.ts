import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * v0.4.9: promo link lifecycle status, landing drama/budget/remark,
 * click ad attribution and CAPI response detail.
 */
export class PromoDashboardColumns implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'drama'
                      AND table_name = 'promo_link'
                      AND column_name = 'status'
                      AND data_type = 'boolean'
                ) THEN
                    ALTER TABLE drama.promo_link ALTER COLUMN status DROP DEFAULT;
                    ALTER TABLE drama.promo_link
                        ALTER COLUMN status TYPE varchar(20)
                        USING (CASE WHEN status THEN 'active' ELSE 'paused' END);
                    ALTER TABLE drama.promo_link ALTER COLUMN status SET DEFAULT 'active';
                END IF;
            END $$;

            ALTER TABLE drama.promo_link
                ADD COLUMN IF NOT EXISTS remark varchar(500),
                ADD COLUMN IF NOT EXISTS drama_id uuid,
                ADD COLUMN IF NOT EXISTS budget numeric(12,2) NOT NULL DEFAULT 0;

            ALTER TABLE drama.click_log
                ADD COLUMN IF NOT EXISTS user_id uuid,
                ADD COLUMN IF NOT EXISTS campaign_id varchar(100),
                ADD COLUMN IF NOT EXISTS ad_id varchar(100),
                ADD COLUMN IF NOT EXISTS fbclid varchar(255),
                ADD COLUMN IF NOT EXISTS platform varchar(50),
                ADD COLUMN IF NOT EXISTS is_real_ad boolean NOT NULL DEFAULT false;

            ALTER TABLE drama.capi_event
                ADD COLUMN IF NOT EXISTS link_id uuid,
                ADD COLUMN IF NOT EXISTS request_body text,
                ADD COLUMN IF NOT EXISTS response_code varchar(20),
                ADD COLUMN IF NOT EXISTS events_received integer,
                ADD COLUMN IF NOT EXISTS error_message text,
                ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;
        `);
    }

    async down(): Promise<void> {
        // forward-only
    }
}
