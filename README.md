# 错题管理系统（学生错题本）

中小学数理化「学生错题管理系统」——H5 端错题本，学生/家长 1:1 使用。

> **项目定位**：这是一套面向 K12（中小学）学生与家长的错题整理、重做与掌握跟踪工具，并非 Sentry 类的错误监控/日志聚合（APM）平台。拍照录入错题 → LLM 切题识别 → 在线/手写重做 → 掌握状态跟踪 → 家长周报，是本系统的核心使用流程。

## 功能特性

### 学生端
- 拍照/手动录入错题，支持整页多题 LLM 切分识别（v1.3.0 起异步化：立即返回 taskId + 进度轮询，不再阻塞触发 504）
- 在线作答/拍照手写重做
- 掌握状态跟踪（v1.3.0 起采用艾宾浩斯间隔调度：第 1/2/4/7/15 天动态复习，走完 5 轮间隔复习即掌握）
- 今日待复习直达、错因标签标注（审题不清/计算粗心/公式遗忘/方法缺失等）、相似题练习
- 错题本 A4 排版导出：纯题卷 / 题卷+详细解析两种模式，一键打印或另存为 PDF，线下重做

### 家长端
- 完全透明查看学生学习情况
- 周报查看（每周一）、站内红点提醒
- 薄弱点画像（v1.3.0）：错因占比 + 薄弱知识点可视化统计，移动端友好

### 管理员端
- LLM 用量监控与告警
- 系统配置管理、用户管理

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3 + TypeScript + Pinia + Vant（H5 移动优先） |
| 后端 | Node.js + Express + TypeScript |
| ORM | TypeORM |
| 数据库 | MariaDB |
| LLM | 多提供商配置（OpenAI 兼容接口），支持主/降级模型与用量记录 |
| 部署 | Docker Compose + GitHub Actions CI/CD |
| 工程 | npm workspaces monorepo |

## 项目结构

```
error-management/
├── frontend/          # 前端 Vue 3 应用
├── backend/           # 后端 Express API
├── database/          # 数据库迁移和初始化脚本
├── design/            # 系统设计文档
├── docs/              # ADR 与领域文档
├── nginx/             # Nginx 反向代理配置
├── .github/workflows/ # GitHub Actions（CI / 自动发布）
├── docker-compose.yml # Docker Compose 部署编排
├── package.json       # 根工作区（npm workspaces，统一 build/test/lint 脚本）
├── 错题管理系统_需求确认书_v1.3_完整版.md # 需求文档
└── AGENTS.md          # AI 代理工作指南
```

## 快速开始

### 前置要求

- Docker 和 Docker Compose
- Node.js 18+（本地开发需要）
- Git

### 使用 Docker Compose 运行

1. 克隆仓库：

```bash
git clone https://github.com/herryfish/error-management.git
cd error-management
```

2. 复制环境变量文件并配置：

```bash
cp .env.example .env
# 编辑 .env，配置数据库密码与 LLM API 密钥
```

3. 启动服务：

```bash
docker compose up -d
```

4. 访问应用：
   - 前端：http://localhost:3001
   - 后端 API：http://localhost:3000
   - Nginx 统一入口：http://localhost:80

## 本地开发

仓库使用 npm workspaces，在根目录安装一次依赖即可同时覆盖前后端：

```bash
npm install          # 根目录执行，安装 frontend/backend 全部依赖
npm run dev:backend  # 后端开发服务器 http://localhost:3000
npm run dev:frontend # 前端开发服务器 http://localhost:3001
```

统一脚本（均在根目录执行）：

| 命令 | 说明 |
| --- | --- |
| `npm run build` | 构建后端（tsc）与前端（vue-tsc + vite build） |
| `npm run test` | 运行后端单元测试（jest） |
| `npm run lint` | 前后端 ESLint 检查 |
| `npm run format` | 前后端 Prettier 格式化 |
| `npm run migrate` | 运行 TypeORM 数据库迁移 |

也可以分别进入 `frontend/`、`backend/` 目录独立安装与开发（各自保留 `package-lock.json`）。

### 数据库

确保 MariaDB 服务运行（可用 `docker compose up -d mariadb`），然后：

```bash
npm run migrate
```

v1.3.0 新增 `questions.errorTags` 列（迁移 `1750000000000-AddErrorTagsToQuestions`，幂等可重复执行）。

### Redis（可选）

v1.3.0 起整页多题识别默认使用 Redis + BullMQ 异步队列（docker-compose 已内置 `redis` 服务并注入 `REDIS_URL`）。
若自托管场景不想引入 Redis，可将 `REDIS_URL` 置空：系统自动降级为进程内队列，接口行为一致（立即返回 taskId + 轮询），但任务不跨进程重启保留，仅建议单实例部署（见 `docs/adr/0004`）。

## 配置

### LLM 配置

系统支持多提供商 LLM 配置，允许配置主模型和降级模型。默认主模型为 `gpt-4o-mini`（多模态，可识别错题图片；`gpt-4-vision-preview` 已被 OpenAI 退役）。

#### 环境变量配置

```env
# 主LLM配置
LLM_PRIMARY_PROVIDER=openai
LLM_PRIMARY_MODEL=gpt-4o-mini
LLM_PRIMARY_API_KEY=sk-your-api-key
LLM_PRIMARY_API_BASE=https://api.openai.com/v1
# 主模型调用超时（毫秒，默认 120000）
LLM_PRIMARY_TIMEOUT_MS=120000

# 降级LLM配置（可选）
LLM_FALLBACK_PROVIDER=anthropic
LLM_FALLBACK_MODEL=claude-3-opus-20240229
LLM_FALLBACK_API_KEY=sk-ant-your-api-key
LLM_FALLBACK_API_BASE=https://api.anthropic.com

# 降级策略
LLM_FALLBACK_ENABLED=true
LLM_FALLBACK_RETRY_COUNT=2
LLM_FALLBACK_TIMEOUT_MS=30000
```

超时控制：主模型客户端超时由 `LLM_PRIMARY_TIMEOUT_MS`（默认 120s，为整页多题 Vision 识别留余量）控制；降级客户端超时由 `LLM_FALLBACK_TIMEOUT_MS`（默认 30s）控制。SDK 内部重试已关闭（`maxRetries: 0`），重试与降级由服务层统一编排。

#### 配置文件

也可以使用 JSON 配置文件（`config.json`）：

```json
{
  "llm": {
    "primary": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "apiKey": "sk-your-api-key",
      "apiBase": "https://api.openai.com/v1"
    },
    "fallback": {
      "provider": "anthropic",
      "model": "claude-3-opus-20240229",
      "apiKey": "sk-ant-your-api-key",
      "apiBase": "https://api.anthropic.com"
    },
    "strategy": {
      "enabled": true,
      "retryCount": 2,
      "timeoutMs": 30000
    }
  }
}
```

### 数据库配置

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your-password
DB_DATABASE=error_management
```

### 安全配置

```env
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3001
```

## 开发工作流

1. 从 `master` 分支创建功能分支
2. 开发并提交（提交信息遵循 Conventional Commits：`feat:` / `fix:` / `chore:` 等）
3. 创建 Pull Request，通过 CI 检查与代码评审
4. 合入 `master`

### 自动发布

PR 合入 `master` 后，[auto-release 工作流](.github/workflows/auto-release.yml) 自动发布：

- 若 PR 已显式修改根目录 `package.json` 的 `version`（与最新 tag 不一致），直接按该版本发布；
- 否则按提交信息推断 bump 类型（`feat!:` / `BREAKING CHANGE` → major，`feat:` → minor，其余 → patch）。

发布过程会同步更新根目录、`backend/`、`frontend/` 的 `package.json` 版本号，打 tag 并创建 GitHub Release。

### CI

GitHub Actions 自动执行：ESLint → 后端单元测试（MariaDB 服务容器）→ 前后端构建；`master` 分支合入后自动通过 SSH 部署到服务器。

## 贡献指引

- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)，便于自动发布推断版本号
- 改动需通过 PR 合入 `master`，CI 绿 + 评审通过后合并
- 涉及数据库迁移、部署脚本等高风险变更需人工审批
- `.env` 等密钥文件不入仓库

## 文档

- [需求文档](错题管理系统_需求确认书_v1.3_完整版.md)
- [系统设计](design/architecture.md)
- [LLM 配置设计](design/llm_config.md)
- [架构决策记录](docs/adr/)
- [API 文档](API_DOCUMENTATION.md)
- [AI 代理工作指南](AGENTS.md)

## 许可证

[MIT](LICENSE) © herryfish
