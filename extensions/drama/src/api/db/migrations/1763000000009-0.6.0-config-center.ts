import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 0.6.0: generic third-party config storage for the 配置中心 hub
 */
export class ThirdPartyConfig1763000000009 implements MigrationInterface {
    name = "ThirdPartyConfig1763000000009";

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.third_party_config (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                category varchar(40) NOT NULL,
                provider varchar(40) NOT NULL,
                enabled boolean NOT NULL DEFAULT false,
                config jsonb NOT NULL DEFAULT '{}'::jsonb,
                remark varchar(300) NOT NULL DEFAULT '',
                verified boolean NOT NULL DEFAULT false,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT uq_tp_config_category_provider UNIQUE (category, provider)
            )
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS drama.third_party_config`);
    }
}
