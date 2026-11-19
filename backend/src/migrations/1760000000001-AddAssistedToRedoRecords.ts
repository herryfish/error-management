import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * redo_records 增加 assisted 列（阶梯式提示兜底标记，v1.4 检索练习防剧透）。
 *
 * assisted = true 表示该轮重做中学生查看了完整解析兜底——无论作答对错，
 * 本轮均判定为「未独立掌握」：不推进掌握轮次、不计入连对，次日同轮重试。
 *
 * 说明：MariaDB 10.2+ 支持 ADD COLUMN IF NOT EXISTS，保证幂等。
 */
export class AddAssistedToRedoRecords1760000000001 implements MigrationInterface {
  name = 'AddAssistedToRedoRecords1760000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE redo_records
      ADD COLUMN IF NOT EXISTS assisted TINYINT(1) NOT NULL DEFAULT 0;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE redo_records
      DROP COLUMN IF EXISTS assisted;
    `)
  }
}
