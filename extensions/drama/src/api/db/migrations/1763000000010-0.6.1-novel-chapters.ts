import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 0.6.1: novel monetization — pricing/tag/stats columns, chapter entity,
 * per-chapter purchase indexes.
 */
export class NovelChapters1763000000010 implements MigrationInterface {
    name = "NovelChapters1763000000010";

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE drama.novel
                ADD COLUMN IF NOT EXISTS tag varchar(16) DEFAULT '连载中',
                ADD COLUMN IF NOT EXISTS price_type varchar(16) DEFAULT 'free',
                ADD COLUMN IF NOT EXISTS coin_price int DEFAULT 0,
                ADD COLUMN IF NOT EXISTS chapter_coin_price int DEFAULT 0,
                ADD COLUMN IF NOT EXISTS chapter_count int DEFAULT 0,
                ADD COLUMN IF NOT EXISTS word_count int DEFAULT 0,
                ADD COLUMN IF NOT EXISTS view_count int DEFAULT 0,
                ADD COLUMN IF NOT EXISTS sale_count int DEFAULT 0,
                ADD COLUMN IF NOT EXISTS rating_avg numeric(3,1) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS rating_count int DEFAULT 0
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS drama.novel_chapter (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                novel_id uuid NOT NULL,
                chapter_no int NOT NULL,
                title varchar(128) NOT NULL,
                content text NOT NULL DEFAULT '',
                is_free boolean NOT NULL DEFAULT true,
                coin_price int NOT NULL DEFAULT 0,
                word_count int NOT NULL DEFAULT 0,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT uq_novel_chapter UNIQUE (novel_id, chapter_no)
            )
        `);
        await queryRunner.query(`
            ALTER TABLE drama.novel_purchase
                ADD COLUMN IF NOT EXISTS chapter_id uuid
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS uq_novel_purchase_chapter
                ON drama.novel_purchase (user_id, novel_id, chapter_id)
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS uq_novel_purchase_whole
                ON drama.novel_purchase ("userId", novel_id)
                WHERE chapter_id IS NULL
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS drama.novel_chapter`);
        await queryRunner.query(`
            ALTER TABLE drama.novel
                DROP COLUMN IF EXISTS tag,
                DROP COLUMN IF EXISTS price_type,
                DROP COLUMN IF EXISTS coin_price,
                DROP COLUMN IF EXISTS chapter_coin_price,
                DROP COLUMN IF EXISTS chapter_count,
                DROP COLUMN IF EXISTS word_count,
                DROP COLUMN IF EXISTS view_count,
                DROP COLUMN IF EXISTS sale_count,
                DROP COLUMN IF EXISTS rating_avg,
                DROP COLUMN IF EXISTS rating_count
        `);
    }
}
