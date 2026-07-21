# 错题管理系统 · 工程自动化设计文档

| 项 | 内容 |
|----|------|
| **状态** | 设计阶段 |
| **版本** | v1.0 |
| **日期** | 2026-07-21 |
| **基线** | 错题管理系统需求确认书 v1.3 |

---

## 1. 变更流程

### 1.1 流程概览

```
① 提出变更（Issue/变更单）
        ↓
② 变更分类（自动/手动）
        ↓
③ 审批（AI/人工）
        ↓  通过
④ 开发实现（分支开发 + 自测）
        ↓
⑤ CI 构建与检查（GitHub Actions）
        ↓  通过
⑥ 合并到主分支
        ↓
⑦ CD 自动部署（Docker Compose）
        ↓
⑧ 部署确认 + 追溯记录
```

### 1.2 变更分类规则

| 类型 | 识别条件 | 审批要求 |
|------|----------|----------|
| **低风险** | 文案修改、样式调整、非密钥配置项、文档更新 | AI 审批可通过 |
| **中风险** | 一般功能开发、API 接口、可逆表结构迁移 | AI 初审 + 可选人工 |
| **高风险** | 数据库不可逆迁移、权限变更、部署脚本、密钥相关 | **必须人工审批** |
| **紧急热修** | 生产环境故障修复 | 人工快速通道 + 事后补单 |

### 1.3 变更单模板

```markdown
# 变更单：[简述]

## 基本信息
- **变更类型**：低风险 / 中风险 / 高风险 / 紧急热修
- **提出人**：
- **提出时间**：
- **关联 Issue**：

## 变更内容
- **目的**：
- **影响范围**：
- **技术方案**：

## 审批
- **AI 审批**：（通过/拒绝/需人工）
- **人工审批**：（审批人、时间、意见）

## 实现
- **开发分支**：
- **Git SHA**：
- **部署时间**：
- **回滚方案**：
```

---

## 2. 审批策略

### 2.1 审批主体

| 审批类型 | 执行者 | 适用场景 |
|----------|--------|----------|
| **AI 审批** | 自动化评审系统 | 低风险变更、常规功能开发初审 |
| **人工审批** | 管理员/部署者 | 高风险变更、最终确认 |

### 2.2 AI 审批规则

```yaml
ai_approval_rules:
  auto_approve:
    - condition: "变更类型 == 低风险"
      action: "自动通过"
    - condition: "变更类型 == 中风险 && 测试通过 && 无数据库迁移"
      action: "通过，建议人工复核"
  
  require_human:
    - condition: "变更类型 == 高风险"
      action: "必须人工审批"
    - condition: "涉及权限变更"
      action: "必须人工审批"
    - condition: "涉及数据库不可逆迁移"
      action: "必须人工审批"
    - condition: "AI 评审置信度 < 0.8"
      action: "建议人工审批"
```

### 2.3 门禁机制

- **合并门禁**：未通过审批的变更不能合并到受保护主分支
- **部署门禁**：未通过 CI 检查的变更不能部署到生产环境
- **审批门禁**：高风险变更在未人工批准时不能上线

---

## 3. CI/CD 流水线设计（GitHub Actions）

### 3.1 仓库分支策略

```
main（受保护主分支）
  ├── develop（开发分支，可选）
  └── feature/*（功能分支）
      └── fix/*（修复分支）
```

**保护规则（main 分支）**：

- 必须通过 PR 合并
- 必须通过 CI 检查
- 必须有至少 1 个审批（高风险需人工）
- 禁止直接推送

### 3.2 CI 流水线

**触发条件**：

- Pull Request 到 main/develop
- 推送到 main/develop

**流水线步骤**：

```yaml
name: CI Pipeline

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  # 1. 依赖安装与缓存
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci

  # 2. 代码检查
  lint:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - name: Run linter
        run: npm run lint
      - name: Run type check
        run: npm run typecheck

  # 3. 构建
  build:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - name: Build frontend
        run: npm run build
      - name: Build backend
        run: npm run build:server

  # 4. 测试
  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Run unit tests
        run: npm test
      - name: Run critical path tests
        run: npm run test:critical

  # 5. 数据库迁移校验
  db-check:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Validate migrations
        run: npm run db:validate
      - name: Dry run migrations
        run: npm run db:migrate:dry-run

  # 6. 安全扫描
  security:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - name: Run security audit
        run: npm audit --production
      - name: Check for secrets
        run: npm run check:secrets
```

### 3.3 CD 流水线

**触发条件**：

- 合并到 main 分支
- 手动触发（紧急回滚）

**流水线步骤**：

```yaml
name: CD Pipeline

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      rollback_version:
        description: 'Version to rollback to'
        required: false

jobs:
  # 1. 构建 Docker 镜像
  docker-build:
    runs-on: ubuntu-latest
    outputs:
      image_tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ secrets.DOCKER_REGISTRY }}/error-book:${{ github.sha }}

  # 2. 部署到生产环境
  deploy:
    needs: docker-build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/error-book
            docker compose pull
            docker compose up -d
            docker compose exec app npm run db:migrate
            docker compose exec app npm run health:check

  # 3. 健康检查
  health-check:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Check application health
        run: |
          for i in {1..10}; do
            if curl -f http://localhost:3000/health; then
              echo "Health check passed"
              exit 0
            fi
            sleep 5
          done
          echo "Health check failed"
          exit 1

  # 4. 记录部署信息
  record-deployment:
    needs: health-check
    runs-on: ubuntu-latest
    steps:
      - name: Record deployment
        run: |
          echo "Deployment recorded: $(date)" >> deployment.log
          echo "Git SHA: ${{ github.sha }}" >> deployment.log
          echo "Triggered by: ${{ github.actor }}" >> deployment.log
```

---

## 4. 环境配置

### 4.1 环境架构

```
生产环境（Production）
├── 应用服务（Docker Compose）
│   ├── Frontend (H5)
│   ├── Backend (API)
│   └── LLM Service
├── 数据库
│   └── MariaDB
└── 反向代理
    └── Nginx
```

**V1 范围**：仅生产环境，可选预发环境

### 4.2 Docker Compose 配置

```yaml
version: '3.8'

services:
  # 前端服务
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  # 后端服务
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://root:${DB_PASSWORD}@mariadb:3306/error_book
      - LLM_API_KEY=${LLM_API_KEY}
      - LLM_ENABLED=${LLM_ENABLED:-true}
    depends_on:
      - mariadb
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # LLM 服务（可选）
  llm-service:
    build:
      context: ./llm-service
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - LLM_PROVIDER=${LLM_PROVIDER}
      - LLM_MODEL=${LLM_MODEL}
      - LLM_API_KEY=${LLM_API_KEY}
    restart: unless-stopped

  # MariaDB
  mariadb:
    image: mariadb:10.11
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
      - MYSQL_DATABASE=error_book
      - MYSQL_CHARSET=utf8mb4
    volumes:
      - mariadb_data:/var/lib/mysql
    restart: unless-stopped

  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  mariadb_data:
```

### 4.3 环境变量管理

**必须配置的环境变量**：

| 变量 | 说明 | 示例 |
|------|------|------|
| `DB_PASSWORD` | MariaDB 密码 | （密钥管理） |
| `LLM_API_KEY` | LLM 服务 API Key | （密钥管理） |
| `LLM_ENABLED` | LLM 降级开关 | `true` / `false` |
| `LLM_PROVIDER` | LLM 提供商 | `openai` / `anthropic` |
| `LLM_MODEL` | LLM 模型 | `gpt-4o-mini` |

**密钥管理原则**：

- `.env` 文件不进 Git 仓库
- 生产环境密钥由服务器侧注入
- CI/CD 中使用 GitHub Secrets
- 定期轮换密钥

---

## 5. 回滚机制

### 5.1 回滚策略

| 策略 | 适用场景 | 操作方式 |
|------|----------|----------|
| **镜像回滚** | 代码变更导致问题 | 使用上一版本的 Docker 镜像重新部署 |
| **数据库回滚** | 数据库迁移导致问题 | 执行逆向迁移脚本 |
| **紧急回滚** | 生产环境故障 | 一键回滚到上一版本 |

### 5.2 镜像版本管理

```bash
# 镜像命名规范
error-book:{git-sha}          # 基于 Git SHA
error-book:{timestamp}        # 基于时间戳
error-book:latest             # 最新稳定版

# 保留最近 10 个版本
# 自动清理旧版本
```

### 5.3 回滚操作流程

**方式一：通过 GitHub Actions**

```yaml
name: Rollback

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback (Git SHA or tag)'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy previous version
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/error-book
            docker compose down
            docker compose pull error-book:${{ inputs.version }}
            docker compose up -d
            docker compose exec app npm run db:migrate:rollback
```

**方式二：手动 SSH 回滚**

```bash
# 登录服务器
ssh deployer@server

# 查看当前版本
docker compose images

# 回滚到指定版本
cd /opt/error-book
export IMAGE_TAG=<git-sha>
docker compose up -d --force-recreate

# 数据库回滚（如需要）
docker compose exec app npm run db:migrate:rollback
```

### 5.4 回滚验证

- 回滚后自动执行健康检查
- 验证关键功能可用性
- 记录回滚原因和时间

---

## 6. 监控与告警

### 6.1 监控体系

```
监控层级
├── 基础设施监控
│   ├── 服务器资源（CPU、内存、磁盘、网络）
│   └── Docker 容器状态
├── 应用监控
│   ├── 应用健康状态
│   ├── API 响应时间
│   └── 错误率
├── 数据库监控
│   ├── MariaDB 连接数
│   ├── 查询性能
│   └── 慢查询
└── 业务监控
    ├── LLM 调用统计
    ├── 用户活跃度
    └── 核心功能使用率
```

### 6.2 健康检查端点

```typescript
// health endpoint
app.get('/health', async (req, res) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    services: {
      database: await checkDatabase(),
      llm: await checkLLM(),
    }
  };
  
  const isHealthy = Object.values(checks.services)
    .every(s => s.status === 'ok');
  
  res.status(isHealthy ? 200 : 503).json(checks);
});
```

### 6.3 告警规则

| 告警类型 | 触发条件 | 通知方式 | 处理方式 |
|----------|----------|----------|----------|
| **应用宕机** | 健康检查失败 | 邮件 + 短信 | 立即处理 |
| **高错误率** | 5xx 错误率 > 5% | 邮件 | 30分钟内处理 |
| **响应慢** | P95 响应时间 > 2s | 邮件 | 排查优化 |
| **磁盘告警** | 磁盘使用率 > 85% | 邮件 | 清理/扩容 |
| **LLM 失败** | LLM 调用失败率 > 10% | 邮件 | 检查配置/额度 |
| **部署失败** | CI/CD 流水线失败 | 邮件 | 修复后重试 |

### 6.4 告警配置

```yaml
# alerting.yml
alerts:
  - name: "应用宕机"
    condition: "health_check.status == 'unhealthy'"
    severity: critical
    notification:
      - email: admin@example.com
      - webhook: https://hooks.slack.com/...
    cooldown: 5m
  
  - name: "高错误率"
    condition: "error_rate > 0.05"
    severity: warning
    notification:
      - email: admin@example.com
    cooldown: 15m
  
  - name: "LLM 失败"
    condition: "llm.failure_rate > 0.1"
    severity: warning
    notification:
      - email: admin@example.com
    cooldown: 30m
```

### 6.5 日志管理

```yaml
# 日志配置
logging:
  level: info
  format: json
  outputs:
    - stdout
    - file: /var/log/error-book/app.log
  rotation:
    max-size: 100MB
    max-files: 10
```

**日志包含字段**：

- 时间戳
- 日志级别
- 请求 ID（链路追踪）
- 用户 ID
- 操作类型
- 错误信息（如有）

### 6.6 部署监控

```yaml
# 部署监控指标
deployment_metrics:
  - name: "部署频率"
    metric: "deployments_per_week"
    target: ">= 2"
  
  - name: "部署成功率"
    metric: "deployment_success_rate"
    target: ">= 95%"
  
  - name: "回滚时间"
    metric: "rollback_duration_minutes"
    target: "< 10"
  
  - name: "部署后错误率"
    metric: "post_deploy_error_rate"
    target: "< 1%"
```

---

## 7. 追溯与审计

### 7.1 追溯信息

每次部署必须记录：

| 信息 | 说明 |
|------|------|
| **Git SHA** | 提交的完整 SHA |
| **变更单 ID** | 关联的 Issue/变更单 |
| **审批人** | 人工审批人或 AI |
| **部署时间** | 部署完成时间戳 |
| **部署者** | 触发部署的人 |
| **变更摘要** | 变更内容简述 |

### 7.2 审计日志存储

```sql
-- 部署审计表
CREATE TABLE deployment_audit (
  id INT PRIMARY KEY AUTO_INCREMENT,
  git_sha VARCHAR(40) NOT NULL,
  change_request_id VARCHAR(50),
  approver VARCHAR(100),
  approver_type ENUM('human', 'ai') DEFAULT 'human',
  deployer VARCHAR(100),
  deploy_time DATETIME NOT NULL,
  change_summary TEXT,
  status ENUM('success', 'failed', 'rolled_back') DEFAULT 'success',
  rollback_time DATETIME,
  rollback_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deploy_time ON deployment_audit(deploy_time);
CREATE INDEX idx_git_sha ON deployment_audit(git_sha);
```

### 7.3 追溯查询

```bash
# 查询某次部署
curl http://localhost:3000/admin/deployments?git_sha={sha}

# 查询部署历史
curl http://localhost:3000/admin/deployments?limit=10

# 查询回滚记录
curl http://localhost:3000/admin/deployments?status=rolled_back
```

---

## 8. LLM 降级与监控

### 8.1 降级配置

```yaml
llm_config:
  enabled: ${LLM_ENABLED:-true}
  fallback:
    # LLM 不可用时的降级策略
    question_recognition: "manual"  # 手动录入
    grading: "manual"              # 手动批改
    guidance: "skip"               # 跳过引导
    similar_questions: "disabled"  # 禁用相似题生成
  
  monitoring:
    # LLM 监控配置
    track_usage: true
    log_all_calls: true
    alert_on_failure_rate: 0.1
```

### 8.2 LLM 用量监控

```sql
-- LLM 用量记录表
CREATE TABLE llm_usage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  scene VARCHAR(50) NOT NULL,  -- 识别、批改、引导、相似题等
  model VARCHAR(100),
  tokens_input INT DEFAULT 0,
  tokens_output INT DEFAULT 0,
  tokens_total INT DEFAULT 0,
  cost DECIMAL(10, 6) DEFAULT 0,
  success BOOLEAN DEFAULT TRUE,
  duration_ms INT,
  request_id VARCHAR(100),
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_scene ON llm_usage(scene);
CREATE INDEX idx_user ON llm_usage(user_id);
CREATE INDEX idx_created ON llm_usage(created_at);
```

### 8.3 LLM 告警规则

```yaml
llm_alerts:
  - name: "LLM 调用失败"
    condition: "llm_failure_rate > 0.1"
    severity: warning
    action: "检查 API Key、网络连接"
  
  - name: "LLM 用量异常"
    condition: "daily_cost > 10"
    severity: warning
    action: "检查调用量、是否异常使用"
  
  - name: "LLM 额度不足"
    condition: "remaining_quota < 100"
    severity: critical
    action: "充值或切换备用提供商"
```

---

## 9. 实施计划

### 9.1 第一阶段：基础搭建

- [ ] Git 仓库初始化与分支策略
- [ ] GitHub Actions 基础 CI 流水线
- [ ] Docker Compose 基础配置
- [ ] 生产环境服务器准备

### 9.2 第二阶段：CI/CD 完善

- [ ] 完整 CI 流水线（检查、构建、测试）
- [ ] CD 流水线（自动部署）
- [ ] 变更单模板与审批流程
- [ ] 部署审计日志

### 9.3 第三阶段：监控与告警

- [ ] 应用健康检查
- [ ] 监控指标收集
- [ ] 告警规则配置
- [ ] 日志管理

### 9.4 第四阶段：优化与完善

- [ ] 回滚机制完善
- [ ] LLM 降级配置
- [ ] 性能优化
- [ ] 文档完善

---

## 10. 成功标准

### 10.1 工程成功标准

1. **自动化程度**：低风险变更从创建到上线无需 SSH 手工操作
2. **可追溯性**：任意部署可追溯到变更单、审批记录、Git SHA
3. **CI 门禁**：CI 失败则不能部署成功
4. **回滚能力**：模拟回滚可在 10 分钟内恢复上一版本
5. **审批门禁**：高风险变更未经人工批准不能上线

### 10.2 指标

| 指标 | 目标值 |
|------|--------|
| 部署成功率 | ≥ 95% |
| 部署后错误率 | < 1% |
| 回滚时间 | < 10 分钟 |
| CI 构建时间 | < 10 分钟 |
| 变更交付周期 | 低风险 < 1 小时 |

---

*本文档基于错题管理系统需求确认书 v1.3 编写，作为工程自动化设计与实施的依据。*
