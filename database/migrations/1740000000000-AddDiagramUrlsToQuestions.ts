import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDiagramUrlsToQuestions1740000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE questions 
      ADD COLUMN diagramUrls JSON NULL AFTER imageUrl;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE questions 
      DROP COLUMN diagramUrls;
    `)
  }
}
