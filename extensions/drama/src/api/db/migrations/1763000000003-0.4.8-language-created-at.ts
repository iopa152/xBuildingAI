import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * v0.4.8: drama_language gains created_at
 */
export class LanguageCreatedAt implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE drama.drama_language
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()
        `);
    }

    async down(): Promise<void> {
        // forward-only
    }
}
