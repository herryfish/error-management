import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 错题增加错因标签列（多维度错因体系）。
 *
 * 说明：MariaDB 10.2+ 支持 ADD COLUMN IF NOT EXISTS，保证幂等——
 * 无论是通过 `npm run migrate`（TypeORM 迁移表记录）还是手工执行，
 * 重复应用都不会报 duplicate column 错误。不指定 AFTER：列位置纯装饰，
 * 且避免依赖迁移链中未必存在的列（评审 B1）。
 */
export class AddErrorTagsToQuestions1750000000000 implements MigrationInterface {
  name = 'AddErrorTagsToQuestions1750000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS errorTags JSON NULL;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE questions
      DROP COLUMN IF EXISTS errorTags;
    `)
  }
}
