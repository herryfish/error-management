# AGENTS.md — 错题管理系统

本文件帮助 AI 代理快速理解项目背景、约束和工作流程。

## 项目概述
- **目的**：H5 端错题管理系统，学生/家长 1:1，支持数理化科目。
- **核心功能**：拍照/手动录入错题、在线+手写重做、掌握状态跟踪（连续3次做对，间隔1天、7天、30天）、日简报/周报、家长控制、LLM 相似题推荐（连续错2次触发）、管理员 LLM 用量告警。
- **非目标**：老师端、多孩、小程序/App、支付短信、整页切题、公网合规等。

## 技术栈
- **前端**：Vue 3 + TypeScript + Pinia + Vant（移动UI库）
- **后端**：Node.js + Express + TypeScript
- **ORM**：TypeORM
- **数据库**：MariaDB
- **LLM 集成**：支持多提供商配置，允许配置降级模型（如OpenAI GPT-4V主模型，Claude 3降级模型）
- **部署**：自家服务器，使用 Docker Compose，通过 GitHub Actions + CI/CD 自动化，禁止手工部署业务代码。

### LLM配置系统
- 通过环境变量或配置文件管理LLM配置
- 支持主模型和降级模型配置
- 可配置降级策略（重试次数、超时时间）
- 所有调用（主/降级）均记录用量

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
└── AGENTS.md          # 本文件
```

## 开发环境

### 前置要求
- Docker 和 Docker Compose
- Node.js 18+ (用于本地开发)
- Git

### 快速启动
```bash
# 使用Docker Compose
cp .env.example .env
# 编辑.env文件配置LLM API密钥等
docker-compose up -d

# 本地开发
cd frontend && npm install && npm run dev
cd backend && npm install && npm run dev
```

### 访问地址
- 前端：http://localhost:3001
- 后端API：http://localhost:3000
- Nginx：http://localhost:80

## 工程自动化要求（v1.3）
变更必须遵循全流程自动化：
1. **提出变更**：通过 Issue/变更单模板（标准化入口）。
2. **审批**：支持人工或 AI 审批；高风险变更（数据库迁移、权限变更、部署脚本）必须人工审批。
3. **开发提交**：AI 或人工实现，提交到 Git。
4. **CI**：GitHub Actions 自动构建、检查、测试。
5. **CD**：自动部署到生产环境（Docker Compose，可回滚）。
6. **追溯**：记录变更说明、审批人、Git SHA、部署时间。

## 开发工作流
- **Git 策略**：受保护主分支，变更需通过审批合并。
- **CI/CD 工具**：GitHub Actions。
- **环境**：V1 仅需生产环境（Docker Compose）。
- **密钥管理**：`.env` 文件不进仓库，由服务器侧注入。

## 关键约束
- **禁止手工部署**：业务代码必须通过 CI/CD 流水线部署。
- **变更追溯**：所有上线必须可追溯到变更单、审批记录、Git SHA。
- **LLM 降级**：设计需保留识别失败、手写批改、引导降级的配置开关（AI Spike 在其他环境执行）。
- **数据迁移**：不可逆迁移需高风险审批（人工）。
- **改判审计**：学生改判需记录审计日志（时间、用户、题目、前后状态）。

## 测试与验证
- **单元测试**：关键路径测试（范围随项目增长）。
- **集成测试**：可能需 MariaDB 本地实例或测试容器。
- **CI 门禁**：失败则不能部署。

## 代理工作建议
- 在修改代码前，先理解变更类型和审批要求。
- 确保所有变更符合 CI/CD 流程，避免手工操作。
- 对于 LLM 相关功能，注意降级配置和用量监控。
- 掌握状态机：连续3次做对（间隔1天、7天、30天），看解析重置未掌握。
- 相似题触发：连续错2次。
- “直接看解析”配置：全局开关。

## AI Coding 自动化工作流程

### 工作流程概览

本项目支持本地AI工具自动化开发流程：

1. **定时检查**：每小时检查GitHub Issues（auto-fix标签）
2. **本地AI修复**：使用AI工具分析Issue并修改代码
3. **本地AI审查**：使用AI工具审查PR代码
4. **自动提交**：提交到GitHub并创建PR
5. **自动合并**：审查通过后自动合并
6. **CI/CD**：GitHub Actions自动构建、测试、部署

### 快速开始

```bash
# 设置定时任务
./scripts/setup-cron.sh setup

# 手动运行完整流程
./scripts/auto-dev-local.sh

# 单独修复Issue
./scripts/auto-fix-local.sh

# 单独审查PR
./scripts/auto-review-local.sh
```

### AI工具集成

本项目支持多种AI Coding工具：

- **MiMo Code**：默认工具
- **Claude Code**：可替换
- **Cursor**：可替换

集成新工具只需修改脚本中的AI调用部分。

## 参考文档
- `AI_CODING_WORKFLOW.md`：AI Coding自动化工作流程完整指南
- `LOCAL_AI_FIX_README.md`：本地AI修复流程说明
- `错题管理系统_需求确认书_v1.3_完整版.md`：完整需求文档（产品+工程自动化）。
- `design/` 目录：系统架构、数据库设计、API设计、部署架构、工程自动化设计文档。
- `implementation_plan.md`：实现计划，包含技术选型和PR拆分。
- `README.md`：项目说明和快速开始指南。