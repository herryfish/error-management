import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * questions 增加裁剪插图列 diagramUrls（ADR 0003：干净的题目插图，不含手写答案）。
 *
 * 说明：ADD COLUMN IF NOT EXISTS（MariaDB 10.2+）保证幂等——生产库当年该列系
 * 迁移链外手工外加，收敛进正式迁移链后首次执行不会撞 duplicate column。
 */
export class AddDiagramUrlsToQuestions1740000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE questions 
      ADD COLUMN IF NOT EXISTS diagramUrls JSON NULL AFTER imageUrl;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE questions 
      DROP COLUMN IF EXISTS diagramUrls;
    `)
  }
}
