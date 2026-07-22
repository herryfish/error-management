# 本地AI自动修复工作流程

## 概述

本项目实现了使用MiMo Code作为本地AI工具，自动从GitHub拉取Issue，本地分析修改代码，然后推送回GitHub的完整工作流程。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    本地AI自动修复工作流程                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 定时检查（每小时）                                       │
│     ↓                                                       │
│  2. 获取GitHub Issues（auto-fix标签）                       │
│     ↓                                                       │
│  3. 克隆/更新本地仓库                                       │
│     ↓                                                       │
│  4. 创建修复分支                                             │
│     ↓                                                       │
│  5. 调用MiMo Code分析Issue                                 │
│     ↓                                                       │
│  6. MiMo Code本地修改代码                                   │
│     ↓                                                       │
│  7. 本地测试验证                                             │
│     ↓                                                       │
│  8. 提交到Git                                               │
│     ↓                                                       │
│  9. 推送到GitHub                                            │
│     ↓                                                       │
│  10. 创建PR                                                 │
│     ↓                                                       │
│  11. GitHub Actions继续后续流程                             │
│     ↓                                                       │
│  12. 自动审核                                               │
│     ↓                                                       │
│  13. 自动合并                                               │
│     ↓                                                       │
│  14. 自动发布                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 文件结构

```
scripts/
├── auto-fix-local.sh      # 主要的自动修复脚本
├── setup-cron.sh          # 定时任务设置脚本
└── LOCAL_AI_FIX_README.md # 本说明文档
```

## 快速开始

### 1. 设置定时任务

```bash
# 设置定时任务（每小时执行一次）
./scripts/setup-cron.sh setup

# 查看当前定时任务
./scripts/setup-cron.sh show

# 移除定时任务
./scripts/setup-cron.sh remove
```

### 2. 手动测试

```bash
# 手动执行一次自动修复
./scripts/auto-fix-local.sh
```

### 3. 查看日志

```bash
# 查看自动修复日志
tail -f /var/log/auto-fix.log
```

## 工作流程详解

### 步骤1：检查GitHub Issues

脚本会定时检查GitHub仓库中带有 `auto-fix` 标签的开放Issue。

```bash
gh issue list --label "auto-fix" --state open --json number,title,body
```

### 步骤2：创建修复分支

对于每个Issue，脚本会创建一个修复分支：

```bash
git checkout -b fix/issue-{number}
```

### 步骤3：调用MiMo Code

脚本会调用MiMo Code分析Issue内容并修改代码：

```bash
MIMOCODE_HOME=$(mktemp -d) mimo run \
    --format json \
    --dangerously-skip-permissions \
    --dir "$REPO_DIR" \
    < "$PROMPT"
```

### 步骤4：提交并推送

```bash
git add -A
git commit -m "fix: 自动修复 Issue #{number}"
git push origin fix/issue-{number}
```

### 步骤5：创建PR

```bash
gh pr create \
    --base master \
    --head fix/issue-{number} \
    --title "fix: 自动修复 Issue #{number}" \
    --body "Closes #{number}"
```

### 步骤6：更新Issue

```bash
gh issue comment {number} --body "## ✅ 自动修复PR已创建..."
gh issue edit {number} --add-label "processing,has-pr"
```

## 配置

### 环境变量

```bash
# GitHub Token（可选，如果已配置gh CLI则不需要）
export GITHUB_TOKEN="your-token"

# MiMo Code配置（可选）
export MIMOCODE_HOME="/tmp/mimo-home"
```

### 定时任务配置

默认每小时执行一次。可以通过修改 `scripts/setup-cron.sh` 中的cron表达式来调整：

```bash
# 每小时执行一次
0 * * * * /path/to/auto-fix-local.sh >> /var/log/auto-fix.log 2>&1

# 每30分钟执行一次
*/30 * * * * /path/to/auto-fix-local.sh >> /var/log/auto-fix.log 2>&1

# 每天早上9点执行
0 9 * * * /path/to/auto-fix-local.sh >> /var/log/auto-fix.log 2>&1
```

## 优势

### 相比GitHub Actions的优势

1. **本地AI能力**：可以使用更强大的AI工具（如MiMo Code）
2. **更好的代码质量**：本地测试和验证
3. **更灵活的修改**：可以进行复杂的代码修改
4. **更安全**：代码修改在本地进行，不会影响远程仓库
5. **更快的响应**：本地执行，无需等待云端资源

### 相比手动修复的优势

1. **自动化**：无需手动检查Issue
2. **一致性**：每次修复都遵循相同的流程
3. **可追溯**：所有修复都有完整的记录
4. **可扩展**：可以轻松添加新的修复逻辑

## 故障排除

### 问题1：MiMo Code未安装

```bash
# 安装MiMo Code
npm install -g mimocode

# 或使用本地安装
npm install
```

### 问题2：GitHub CLI未配置

```bash
# 配置GitHub CLI
gh auth login
```

### 问题3：Git权限问题

```bash
# 配置Git用户信息
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

### 问题4：定时任务未执行

```bash
# 检查cron服务状态
systemctl status cron

# 查看cron日志
tail -f /var/log/syslog | grep cron
```

## 监控

### 查看自动修复日志

```bash
# 查看最近的日志
tail -f /var/log/auto-fix.log

# 查看特定Issue的处理日志
grep "Issue #123" /var/log/auto-fix.log
```

### 查看GitHub Actions

访问：https://github.com/herryfish/error-management/actions

## 贡献

欢迎贡献代码和改进建议！

## 许可证

MIT License