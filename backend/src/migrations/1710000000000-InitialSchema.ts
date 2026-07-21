import { MigrationInterface, QueryRunner } from 'typeorm'

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('student', 'parent', 'admin') DEFAULT 'student',
        studentId VARCHAR(36),
        parentId VARCHAR(36),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    // Create students table
    await queryRunner.query(`
      CREATE TABLE students (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        grade VARCHAR(50),
        school VARCHAR(255),
        userId VARCHAR(36),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )
    `)

    // Create parents table
    await queryRunner.query(`
      CREATE TABLE parents (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        userId VARCHAR(36),
        studentId VARCHAR(36),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE SET NULL
      )
    `)

    // Create questions table
    await queryRunner.query(`
      CREATE TABLE questions (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        subject ENUM('math', 'physics', 'chemistry') NOT NULL,
        type ENUM('choice', 'fill', 'answer') NOT NULL,
        difficulty INT DEFAULT 1,
        knowledgePoints JSON,
        imageUrl VARCHAR(500),
        originalImageUrl VARCHAR(500),
        answer TEXT,
        explanation TEXT,
        isIdentified BOOLEAN DEFAULT FALSE,
        confidence DECIMAL(3,2),
        studentId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Create redo_records table
    await queryRunner.query(`
      CREATE TABLE redo_records (
        id VARCHAR(36) PRIMARY KEY,
        type ENUM('online', 'photo') NOT NULL,
        answer TEXT NOT NULL,
        isCorrect BOOLEAN DEFAULT FALSE,
        gradeResult TEXT,
        modelUsed VARCHAR(100),
        feedback TEXT,
        questionId VARCHAR(36) NOT NULL,
        studentId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (questionId) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Create mastery table
    await queryRunner.query(`
      CREATE TABLE mastery (
        id VARCHAR(36) PRIMARY KEY,
        status ENUM('new', 'learning', 'mastered') DEFAULT 'new',
        correctCount INT DEFAULT 0,
        incorrectCount INT DEFAULT 0,
        lastCorrectDate TIMESTAMP NULL,
        lastIncorrectDate TIMESTAMP NULL,
        nextReviewDate TIMESTAMP NULL,
        intervalLevel INT DEFAULT 0,
        lastReviewDate TIMESTAMP NULL,
        questionId VARCHAR(36) NOT NULL,
        studentId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (questionId) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_question_student (questionId, studentId)
      )
    `)

    // Create similar_questions table
    await queryRunner.query(`
      CREATE TABLE similar_questions (
        id VARCHAR(36) PRIMARY KEY,
        content TEXT NOT NULL,
        isApplicable BOOLEAN DEFAULT TRUE,
        reason TEXT,
        originalQuestionId VARCHAR(36) NOT NULL,
        generatedBy VARCHAR(100),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (originalQuestionId) REFERENCES questions(id) ON DELETE CASCADE
      )
    `)

    // Create llm_usage table
    await queryRunner.query(`
      CREATE TABLE llm_usage (
        id VARCHAR(36) PRIMARY KEY,
        scene ENUM('recognition', 'grading', 'guidance', 'similar', 'other') NOT NULL,
        provider VARCHAR(50) NOT NULL,
        model VARCHAR(100) NOT NULL,
        isFallback BOOLEAN DEFAULT FALSE,
        tokensInput INT DEFAULT 0,
        tokensOutput INT DEFAULT 0,
        tokensTotal INT DEFAULT 0,
        cost DECIMAL(10,6) DEFAULT 0,
        latencyMs INT DEFAULT 0,
        success BOOLEAN DEFAULT TRUE,
        error TEXT,
        businessId VARCHAR(36),
        userId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE notifications (
        id VARCHAR(36) PRIMARY KEY,
        type ENUM('weekly_report', 'similar_question', 'system') NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        isRead BOOLEAN DEFAULT FALSE,
        userId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Create weekly_reports table
    await queryRunner.query(`
      CREATE TABLE weekly_reports (
        id VARCHAR(36) PRIMARY KEY,
        weekStart TIMESTAMP NOT NULL,
        weekEnd TIMESTAMP NOT NULL,
        weakPoints JSON,
        totalQuestions INT DEFAULT 0,
        masteredQuestions INT DEFAULT 0,
        similarQuestionsGenerated INT DEFAULT 0,
        totalRedos INT DEFAULT 0,
        masteryRate DECIMAL(5,2) DEFAULT 0,
        userId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Create sys_config table
    await queryRunner.query(`
      CREATE TABLE sys_config (
        id VARCHAR(36) PRIMARY KEY,
        \`key\` VARCHAR(255) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'system',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    // Create indexes
    await queryRunner.query(`CREATE INDEX idx_users_role ON users(role)`)
    await queryRunner.query(`CREATE INDEX idx_questions_student ON questions(studentId)`)
    await queryRunner.query(`CREATE INDEX idx_questions_subject ON questions(subject)`)
    await queryRunner.query(`CREATE INDEX idx_redo_records_question ON redo_records(questionId)`)
    await queryRunner.query(`CREATE INDEX idx_redo_records_student ON redo_records(studentId)`)
    await queryRunner.query(`CREATE INDEX idx_mastery_student ON mastery(studentId)`)
    await queryRunner.query(`CREATE INDEX idx_mastery_status ON mastery(status)`)
    await queryRunner.query(`CREATE INDEX idx_mastery_next_review ON mastery(nextReviewDate)`)
    await queryRunner.query(`CREATE INDEX idx_similar_questions_original ON similar_questions(originalQuestionId)`)
    await queryRunner.query(`CREATE INDEX idx_llm_usage_user ON llm_usage(userId)`)
    await queryRunner.query(`CREATE INDEX idx_llm_usage_scene ON llm_usage(scene)`)
    await queryRunner.query(`CREATE INDEX idx_llm_usage_created ON llm_usage(createdAt)`)
    await queryRunner.query(`CREATE INDEX idx_notifications_user ON notifications(userId)`)
    await queryRunner.query(`CREATE INDEX idx_notifications_read ON notifications(isRead)`)
    await queryRunner.query(`CREATE INDEX idx_weekly_reports_user ON weekly_reports(userId)`)
    await queryRunner.query(`CREATE INDEX idx_weekly_reports_week ON weekly_reports(weekStart, weekEnd)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS sys_config`)
    await queryRunner.query(`DROP TABLE IF EXISTS weekly_reports`)
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`)
    await queryRunner.query(`DROP TABLE IF EXISTS llm_usage`)
    await queryRunner.query(`DROP TABLE IF EXISTS similar_questions`)
    await queryRunner.query(`DROP TABLE IF EXISTS mastery`)
    await queryRunner.query(`DROP TABLE IF EXISTS redo_records`)
    await queryRunner.query(`DROP TABLE IF EXISTS questions`)
    await queryRunner.query(`DROP TABLE IF EXISTS parents`)
    await queryRunner.query(`DROP TABLE IF EXISTS students`)
    await queryRunner.query(`DROP TABLE IF EXISTS users`)
  }
}