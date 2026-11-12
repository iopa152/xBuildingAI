import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 0.7.0: hard per-user dedup for redeem codes
 */
export class RedeemDedup1763000000013 implements MigrationInterface {
    name = "RedeemDedup1763000000013";

    async up(queryRunner: QueryRunner): Promise<void> {
        // remove existing duplicate pairs first (keep the earliest)
        await queryRunner.query(`
            DELETE FROM drama.redeem_record a
             USING drama.redeem_record b
             WHERE a.id > b.id
               AND a.code = b.code
               AND a."userId" = b."userId"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS uq_redeem_record_code_user
                ON drama.redeem_record (code, "userId")
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS drama.uq_redeem_record_code_user`);
    }
}
