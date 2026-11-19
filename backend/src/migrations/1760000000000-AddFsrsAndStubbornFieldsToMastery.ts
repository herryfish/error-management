import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * mastery 表扩展：FSRS 动态调度字段 + 顽固薄弱点标记列（v1.4 复习排程升级）。
 *
 * - FSRS 字段（stability / difficulty / scheduledDays）：由 `REVIEW_SCHEDULER=fsrs`
 *   启用动态排程时写入；静态艾宾浩斯模式（默认）下保持 NULL，互不干扰。
 * - 顽固薄弱点（isStubborn / stubbornMarkedAt）：累计做错 ≥ 阈值（默认 3 次）且未掌握
 *   时自动打标；迁移同时对存量数据回填，避免上线后历史顽固题不生效。
 *
 * 说明：MariaDB 10.2+ 支持 ADD COLUMN IF NOT EXISTS，保证幂等——重复应用不会报
 * duplicate column 错误。回填语句带 `isStubborn = 0` 守卫，二跑为 no-op。
 */
export class AddFsrsAndStubbornFieldsToMastery1760000000000 implements MigrationInterface {
  name = 'AddFsrsAndStubbornFieldsToMastery1760000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE mastery
      ADD COLUMN IF NOT EXISTS stability DOUBLE NULL,
      ADD COLUMN IF NOT EXISTS difficulty DOUBLE NULL,
      ADD COLUMN IF NOT EXISTS scheduledDays INT NULL,
      ADD COLUMN IF NOT EXISTS isStubborn TINYINT(1) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS stubbornMarkedAt DATETIME NULL;
    `)

    // 存量回填：已有足量错误记录且未掌握的历史顽固题补标（幂等：仅处理 isStubborn = 0）
    await queryRunner.query(`
      UPDATE mastery
      SET isStubborn = 1,
          stubbornMarkedAt = COALESCE(lastIncorrectDate, updatedAt)
      WHERE incorrectCount >= 3
        AND status != 'mastered'
        AND isStubborn = 0;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE mastery
      DROP COLUMN IF EXISTS stubbornMarkedAt,
      DROP COLUMN IF EXISTS isStubborn,
      DROP COLUMN IF EXISTS scheduledDays,
      DROP COLUMN IF EXISTS difficulty,
      DROP COLUMN IF EXISTS stability;
    `)
  }
}
