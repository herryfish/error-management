import { MigrationInterface, QueryRunner } from 'typeorm'

export class InitMasteryRecords1720000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO mastery (id, questionId, studentId, status, correctCount, incorrectCount, intervalLevel, createdAt, updatedAt)
      SELECT 
        UUID(),
        q.id,
        q.studentId,
        'new',
        0,
        0,
        0,
        NOW(),
        NOW()
      FROM questions q
      LEFT JOIN mastery m ON q.id = m.questionId AND q.studentId = m.studentId
      WHERE m.id IS NULL AND q.studentId IS NOT NULL;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM mastery WHERE status = 'new' AND correctCount = 0 AND incorrectCount = 0;`)
  }
}
