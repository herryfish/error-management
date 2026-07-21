# 错题管理系统

H5端错题管理系统，学生/家长1:1，支持数理化科目。

## 技术栈

- **前端**：Vue 3 + TypeScript + Pinia + Vant
- **后端**：Node.js + Express + TypeScript
- **ORM**：TypeORM
- **数据库**：MariaDB
- **LLM**：支持多提供商配置，允许配置降级模型
- **部署**：Docker Compose + GitHub Actions

## 项目结构

```
error-management/
├── frontend/          # 前端Vue 3应用
├── backend/           # 后端Express API
├── database/          # 数据库迁移和初始化脚本
├── design/            # 系统设计文档
├── nginx/             # Nginx配置
├── .github/workflows/ # GitHub Actions CI/CD
├── docker-compose.yml # Docker Compose配置
├── implementation_plan.md # 实现计划
├── 错题管理系统_需求确认书_v1.3_完整版.md # 需求文档
└── AGENTS.md          # 代理工作指南
```

## 快速开始

### 前置要求

- Docker 和 Docker Compose
- Node.js 18+ (用于本地开发)
- Git

### 使用Docker Compose运行

1. 克隆仓库：
```bash
git clone <repository-url>
cd error-management
```

2. 复制环境变量文件：
```bash
cp .env.example .env
```

3. 编辑 `.env` 文件，配置必要的环境变量（特别是LLM API密钥）。

4. 启动服务：
```bash
docker-compose up -d
```

5. 访问应用：
- 前端：http://localhost:3001
- 后端API：http://localhost:3000
- Nginx：http://localhost:80

### 本地开发

#### 前端开发

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器运行在 http://localhost:3001

#### 后端开发

```bash
cd backend
npm install
npm run dev
```

后端开发服务器运行在 http://localhost:3000

#### 数据库

确保MariaDB服务运行，然后：

```bash
cd backend
npm run migrate
```

## 配置

### LLM配置

系统支持多提供商LLM配置，允许配置主模型和降级模型。

#### 环境变量配置

```env
# 主LLM配置
LLM_PRIMARY_PROVIDER=openai
LLM_PRIMARY_MODEL=gpt-4-vision-preview
LLM_PRIMARY_API_KEY=sk-your-api-key
LLM_PRIMARY_API_BASE=https://api.openai.com/v1

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

#### 配置文件

也可以使用JSON配置文件（`config.json`）：

```json
{
  "llm": {
    "primary": {
      "provider": "openai",
      "model": "gpt-4-vision-preview",
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

## 功能特性

### 学生端
- 拍照/手动录入错题
- 在线作答/拍照手写重做
- 掌握状态跟踪（连续3次做对，间隔1/7/30天）
- 今日任务推荐
- 相似题练习

### 家长端
- 完全透明查看学生学习情况
- 周报查看（每周一）
- 站内红点提醒

### 管理员端
- LLM用量监控
- 系统配置管理
- 用户管理

## 开发工作流

### Git工作流

1. 从`main`分支创建功能分支
2. 开发功能并提交
3. 创建Pull Request
4. 代码评审
5. 合并到`develop`分支
6. 定期合并到`main`分支

### CI/CD

使用GitHub Actions进行自动化：

1. **代码检查**：ESLint、Prettier
2. **测试**：单元测试、集成测试
3. **构建**：前端构建、后端编译
4. **部署**：Docker镜像构建和部署

### 变更管理

所有变更必须通过：

1. **提出变更**：通过Issue/变更单模板
2. **审批**：人工或AI审批
3. **开发**：实现功能并提交
4. **CI**：自动构建和测试
5. **CD**：自动部署到生产环境

## 文档

- [需求文档](错题管理系统_需求确认书_v1.3_完整版.md)
- [实现计划](implementation_plan.md)
- [系统设计](design/)
- [代理工作指南](AGENTS.md)

## 许可证

私有项目，仅供内部使用。