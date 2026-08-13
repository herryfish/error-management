import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddMultiRecognitionScene1730000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE llm_usage 
      MODIFY COLUMN scene ENUM('recognition', 'grading', 'guidance', 'similar', 'multi_recognition', 'other') NOT NULL;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE llm_usage 
      MODIFY COLUMN scene ENUM('recognition', 'grading', 'guidance', 'similar', 'other') NOT NULL;
    `)
  }
}
