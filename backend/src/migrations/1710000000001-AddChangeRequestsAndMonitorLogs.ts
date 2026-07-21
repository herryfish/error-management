import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChangeRequestsAndMonitorLogs1710000000001 implements MigrationInterface {
  name = 'AddChangeRequestsAndMonitorLogs1710000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create change_requests table
    await queryRunner.query(`
      CREATE TABLE change_requests (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        type ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'low',
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        status ENUM('pending', 'approved', 'rejected', 'in_progress', 'completed', 'deployed') DEFAULT 'pending',
        approvalNote TEXT,
        approvedBy VARCHAR(36),
        approvedAt TIMESTAMP NULL,
        gitCommitHash VARCHAR(100),
        deploymentId VARCHAR(100),
        deploymentUrl VARCHAR(500),
        creatorId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (creatorId) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Create monitor_logs table
    await queryRunner.query(`
      CREATE TABLE monitor_logs (
        id VARCHAR(36) PRIMARY KEY,
        level ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info',
        type ENUM('health_check', 'deployment', 'llm_usage', 'system_error', 'security') NOT NULL,
        message VARCHAR(255) NOT NULL,
        details TEXT,
        source VARCHAR(100),
        userId VARCHAR(36),
        ipAddress VARCHAR(45),
        acknowledged BOOLEAN DEFAULT FALSE,
        acknowledgedBy VARCHAR(36),
        acknowledgedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes
    await queryRunner.query(`CREATE INDEX idx_change_requests_status ON change_requests(status)`)
    await queryRunner.query(`CREATE INDEX idx_change_requests_type ON change_requests(type)`)
    await queryRunner.query(`CREATE INDEX idx_change_requests_creator ON change_requests(creatorId)`)
    await queryRunner.query(`CREATE INDEX idx_monitor_logs_level ON monitor_logs(level)`)
    await queryRunner.query(`CREATE INDEX idx_monitor_logs_type ON monitor_logs(type)`)
    await queryRunner.query(`CREATE INDEX idx_monitor_logs_created ON monitor_logs(createdAt)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS monitor_logs`)
    await queryRunner.query(`DROP TABLE IF EXISTS change_requests`)
  }
}