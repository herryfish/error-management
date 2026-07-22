# AI Coding 自动化工作流程

> 本文档为AI Coding工具提供完整的自动化开发流程指南。
> 后续AI工具可自动读取此文档并配置相关功能。

## 项目概述

- **项目名称**: 错题管理系统
- **GitHub仓库**: herryfish/error-management
- **技术栈**: Vue 3 + TypeScript + Node.js + MariaDB
- **部署方式**: Docker Compose + GitHub Actions

## 自动化工作流程

### 流程架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Coding 自动化工作流程                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              本地AI工作流程（推荐）                        │   │
│  │                                                         │   │
│  │  1. 定时检查GitHub Issues                               │   │
│  │     ↓                                                   │   │
│  │  2. 本地AI分析Issue并修改代码                           │   │
│  │     ↓                                                   │   │
│  │  3. 本地测试验证                                        │   │
│  │     ↓                                                   │   │
│  │  4. 提交到GitHub                                       │   │
│  │     ↓                                                   │   │
│  │  5. 本地AI审查PR                                       │   │
│  │     ↓                                                   │   │
│  │  6. 自动合并                                            │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              GitHub Actions CI/CD                        │   │
│  │                                                         │   │
│  │  7. 自动构建和测试                                      │   │
│  │     ↓                                                   │   │
│  │  8. 自动部署                                            │   │
│  │     ↓                                                   │   │
│  │  9. 自动发布                                            │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 快速开始

### 1. 环境要求

```bash
# 必需工具
- Git
- GitHub CLI (gh)
- Node.js 18+
- Python 3.6+
- AI Coding工具（如MiMo Code、Claude Code、Cursor等）

# 可选工具
- Docker
- Docker Compose
```

### 2. 配置GitHub CLI

```bash
# 安装GitHub CLI
# macOS: brew install gh
# Linux: sudo apt install gh
# Windows: winget install GitHub.cli

# 登录GitHub
gh auth login
```

### 3. 配置AI Coding工具

#### MiMo Code配置

```bash
# 安装MiMo Code
npm install -g mimocode

# 验证安装
mimo --version
```

#### Claude Code配置

```bash
# 安装Claude Code
npm install -g @anthropic-ai/claude-code

# 验证安装
claude-code --version
```

### 4. 设置定时任务

```bash
# 运行定时任务设置脚本
./scripts/setup-cron.sh setup

# 验证定时任务
./scripts/setup-cron.sh show
```

## 工作流程详解

### 流程1：修复Issue

当有新的Issue带有 `auto-fix` 标签时：

```bash
# 运行自动修复脚本
./scripts/auto-fix-local.sh
```

**执行步骤**:
1. 获取GitHub上的auto-fix Issues
2. 为每个Issue创建修复分支
3. 调用AI工具分析Issue
4. 本地修改代码
5. 提交并推送
6. 创建PR

### 流程2：审查PR

当有新的PR需要审查时：

```bash
# 运行自动审查脚本
./scripts/auto-review-local.sh
```

**执行步骤**:
1. 获取待审查的PR
2. 拉取PR代码
3. 调用AI工具审查代码
4. 自动批准或请求修改

### 流程3：完整开发流程

同时执行修复Issue和审查PR：

```bash
# 运行完整开发流程脚本
./scripts/auto-dev-local.sh
```

## 脚本说明

### 核心脚本

| 脚本 | 功能 | 使用方法 |
|------|------|----------|
| `auto-fix-local.sh` | 本地AI修复Issue | `./scripts/auto-fix-local.sh` |
| `auto-review-local.sh` | 本地AI审查PR | `./scripts/auto-review-local.sh` |
| `auto-dev-local.sh` | 完整开发流程 | `./scripts/auto-dev-local.sh` |
| `setup-cron.sh` | 设置定时任务 | `./scripts/setup-cron.sh setup` |

### 辅助脚本

| 脚本 | 功能 | 使用方法 |
|------|------|----------|
| `simple-test.sh` | 简单测试 | `./scripts/simple-test.sh` |
| `test-auto-fix.sh` | 自动修复测试 | `./scripts/test-auto-fix.sh` |

## AI工具集成指南

### 集成新的AI工具

如果要使用其他AI工具（如Claude Code、Cursor等），需要：

1. **修改脚本中的AI调用部分**

```bash
# 原来的MiMo Code调用
MIMOCODE_HOME=$(mktemp -d) mimo run \
    --format json \
    --dangerously-skip-permissions \
    --dir "$REPO_DIR" \
    < "$PROMPT"

# 改为Claude Code调用
claude-code analyze --issue "$ISSUE_TITLE" --body "$ISSUE_BODY"

# 或改为Cursor调用
cursor --prompt "$PROMPT"
```

2. **修改提示词格式**

不同AI工具有不同的提示词格式要求，需要根据具体工具调整。

3. **修改输出解析**

不同AI工具的输出格式不同，需要调整解析逻辑。

### 示例：集成Claude Code

```bash
# 修改auto-fix-local.sh中的AI调用部分
review_pr() {
    # ...
    # 使用Claude Code审查代码
    claude-code review \
        --issue "$ISSUE_TITLE" \
        --body "$ISSUE_BODY" \
        --output /tmp/claude-review.json
    # ...
}
```

### 示例：集成Cursor

```bash
# 修改auto-fix-local.sh中的AI调用部分
review_pr() {
    # ...
    # 使用Cursor审查代码
    cursor --prompt "审查这个PR: $PR_TITLE" \
           --file /tmp/review-prompt.txt
    # ...
}
```

## 配置文件说明

### 环境变量

```bash
# GitHub配置
GITHUB_TOKEN="your-github-token"  # 可选，如果已配置gh CLI则不需要

# AI工具配置
MIMOCODE_HOME="/tmp/mimo-home"    # MiMo Code工作目录
ANTHROPIC_API_KEY="your-key"      # Claude API密钥（如果使用Claude）

# 项目配置
REPO_DIR="/path/to/project"       # 项目根目录
GITHUB_REPO="owner/repo"          # GitHub仓库
```

### 定时任务配置

```bash
# 默认配置：每小时执行一次
0 * * * * /path/to/auto-dev-local.sh >> /var/log/auto-dev.log 2>&1

# 自定义配置
# 每30分钟执行一次
*/30 * * * * /path/to/auto-dev-local.sh >> /var/log/auto-dev.log 2>&1

# 每天早上9点执行
0 9 * * * /path/to/auto-dev-local.sh >> /var/log/auto-dev.log 2>&1
```

## 故障排除

### 常见问题

#### 1. AI工具未安装

```bash
# 检查AI工具是否安装
which mimo || which claude-code || which cursor

# 安装MiMo Code
npm install -g mimocode

# 安装Claude Code
npm install -g @anthropic-ai/claude-code
```

#### 2. GitHub CLI未配置

```bash
# 检查GitHub CLI配置
gh auth status

# 登录GitHub
gh auth login
```

#### 3. Git权限问题

```bash
# 配置Git用户信息
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

# 配置Git凭据
git config --global credential.helper store
```

#### 4. 定时任务未执行

```bash
# 检查cron服务状态
systemctl status cron

# 查看cron日志
tail -f /var/log/syslog | grep cron

# 手动测试脚本
./scripts/auto-dev-local.sh
```

#### 5. AI工具调用失败

```bash
# 检查AI工具是否可用
mimo --version

# 检查API密钥是否配置
echo $ANTHROPIC_API_KEY

# 手动测试AI工具
echo "测试" | mimo run --format json
```

## 扩展指南

### 添加新的AI工具

1. 在 `scripts/` 目录下创建新的工具脚本
2. 修改 `auto-fix-local.sh` 和 `auto-review-local.sh` 中的AI调用部分
3. 更新 `AI_CODING_WORKFLOW.md` 文档

### 添加新的工作流程

1. 在 `scripts/` 目录下创建新的工作流程脚本
2. 更新 `setup-cron.sh` 添加新的定时任务
3. 更新 `AI_CODING_WORKFLOW.md` 文档

### 自定义提示词

不同AI工具有不同的提示词格式要求。可以根据具体工具调整：

```bash
# MiMo Code提示词格式
cat > prompt.txt << 'EOF'
你的任务描述...
EOF

# Claude Code提示词格式
claude-code --prompt "你的任务描述..."

# Cursor提示词格式
cursor --prompt "你的任务描述..."
```

## 监控和日志

### 查看日志

```bash
# 查看自动修复日志
tail -f /var/log/auto-fix.log

# 查看自动审查日志
tail -f /var/log/auto-review.log

# 查看完整开发流程日志
tail -f /var/log/auto-dev.log
```

### 查看GitHub Actions

```bash
# 查看工作流运行状态
gh run list

# 查看特定工作流
gh run view <run-id>
```

## 贡献指南

### 添加新功能

1. 在 `scripts/` 目录下创建新的脚本
2. 更新 `AI_CODING_WORKFLOW.md` 文档
3. 提交PR

### 报告问题

1. 在GitHub上创建Issue
2. 添加 `bug` 标签
3. 详细描述问题

## 许可证

MIT License