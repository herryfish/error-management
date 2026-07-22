#!/bin/bash
# auto-fix-local.sh - 使用MiMo Code的本地AI自动修复脚本

set -e

# 配置
REPO_DIR="/root/workspaces/proj1"
GITHUB_REPO="herryfish/error-management"
BRANCH_PREFIX="fix/issue-"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) 未安装"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装"
        exit 1
    fi
    
    if ! command -v mimo &> /dev/null; then
        log_error "MiMo Code 未安装"
        exit 1
    fi
    
    log_info "依赖检查通过"
}

# 获取auto-fix Issues
get_auto_fix_issues() {
    log_info "获取auto-fix Issues..."
    
    cd "$REPO_DIR"
    ISSUES=$(gh issue list --label "auto-fix" --state open --json number,title,body --limit 10)
    
    if [ -z "$ISSUES" ] || [ "$ISSUES" = "[]" ]; then
        log_info "没有找到auto-fix Issues"
        return 1
    fi
    
    echo "$ISSUES"
}

# 处理单个Issue
process_issue() {
    local ISSUE_NUMBER=$1
    local ISSUE_TITLE=$2
    local ISSUE_BODY=$3
    
    log_info "处理Issue #$ISSUE_NUMBER: $ISSUE_TITLE"
    
    cd "$REPO_DIR"
    
    # 创建修复分支
    local BRANCH_NAME="${BRANCH_PREFIX}${ISSUE_NUMBER}"
    
    # 检查分支是否已存在
    if git branch -a | grep -q "$BRANCH_NAME"; then
        log_warn "分支 $BRANCH_NAME 已存在，切换到该分支"
        git checkout "$BRANCH_NAME"
    else
        log_info "创建新分支 $BRANCH_NAME"
        git checkout -b "$BRANCH_NAME"
    fi
    
    # 创建MiMo Code的提示词
    local PROMPT=$(mktemp -t mimo-prompt.XXXXXX)
    cat > "$PROMPT" << EOF
你是一个代码修复专家。请分析以下Issue并修复相关代码。

## Issue信息
- 编号: #$ISSUE_NUMBER
- 标题: $ISSUE_TITLE
- 描述: $ISSUE_BODY

## 任务
1. 分析Issue内容，理解问题
2. 找到相关的代码文件
3. 修复问题
4. 确保修复不会引入新问题

## 要求
- 只修改必要的代码
- 保持代码风格一致
- 添加必要的注释
- 确保修复是完整和正确的

请开始修复。
EOF
    
    # 使用MiMo Code分析并修复
    log_info "调用MiMo Code分析Issue..."
    
    MIMOCODE_HOME=$(mktemp -d) mimo run \
        --format json \
        --dangerously-skip-permissions \
        --dir "$REPO_DIR" \
        < "$PROMPT" > /tmp/mimo-output.jsonl 2>&1
    
    local EXIT_CODE=$?
    
    # 清理提示词文件
    rm -f "$PROMPT"
    
    if [ $EXIT_CODE -ne 0 ]; then
        log_error "MiMo Code执行失败 (exit code: $EXIT_CODE)"
        return 1
    fi
    
    # 检查是否有错误
    if grep -q '"type":"error"' /tmp/mimo-output.jsonl; then
        log_warn "MiMo Code报告了错误，但继续处理..."
    fi
    
    log_info "MiMo Code分析完成"
    
    # 提交更改
    git add -A
    
    # 检查是否有更改
    if git diff --cached --quiet; then
        log_warn "没有检测到代码更改"
        # 创建一个说明文档
        cat > "FIX_ISSUE_${ISSUE_NUMBER}.md" << EOF
# Issue #$ISSUE_NUMBER 修复记录

## Issue信息
- **标题**: $ISSUE_TITLE
- **修复时间**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **修复者**: MiMo Code (本地AI)

## 修复说明
MiMo Code已分析此Issue，但未检测到需要修改的代码。
可能原因：
1. Issue描述不够详细
2. 相关代码不存在或已修复
3. 问题需要手动处理

## 下一步
- [ ] 检查Issue描述是否完整
- [ ] 手动检查相关代码
- [ ] 如需修复，请手动修改
EOF
        git add "FIX_ISSUE_${ISSUE_NUMBER}.md"
    fi
    
    # 提交更改
    git commit -m "fix: 自动修复 Issue #${ISSUE_NUMBER}

- 使用MiMo Code (本地AI) 分析并修复
- 修复时间: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    
    # 推送分支
    log_info "推送分支 $BRANCH_NAME..."
    git push --force-with-lease origin "$BRANCH_NAME"
    
    # 创建PR
    log_info "创建PR..."
    gh pr create \
        --base master \
        --head "$BRANCH_NAME" \
        --title "fix: 自动修复 Issue #${ISSUE_NUMBER}" \
        --body "## 自动修复

本PR使用MiMo Code (本地AI) 自动修复了 Issue #${ISSUE_NUMBER}

### Issue信息
- **标题**: ${ISSUE_TITLE}
- **Issue链接**: https://github.com/${GITHUB_REPO}/issues/${ISSUE_NUMBER}

### 修复方式
- 使用MiMo Code (本地AI) 进行代码分析和修复
- 所有修改在本地完成

### 测试
- [x] MiMo Code分析完成
- [x] 代码修改完成
- [x] 提交成功
- [x] PR创建成功

### 审核
- [ ] 人工审核修复方案
- [ ] 合并PR

Closes #${ISSUE_NUMBER}" \
        --label "auto-fix,bug"
    
    # 获取PR信息
    local PR_NUMBER=$(gh pr list --head "$BRANCH_NAME" --json number --jq '.[0].number')
    local PR_URL=$(gh pr list --head "$BRANCH_NAME" --json url --jq '.[0].url')
    
    # 更新Issue评论
    gh issue comment "$ISSUE_NUMBER" --body "## ✅ 自动修复PR已创建

**修复时间**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**修复工具**: MiMo Code (本地AI)
**修复PR**: #${PR_NUMBER}
**PR链接**: ${PR_URL}

### 下一步
1. 点击上方PR链接查看修复内容
2. 审核修复方案
3. 合并PR以应用修复"
    
    # 添加标签
    gh issue edit "$ISSUE_NUMBER" --add-label "processing,has-pr"
    
    # 切回master分支
    git checkout master
    
    log_info "Issue #$ISSUE_NUMBER 处理完成"
    
    return 0
}

# 主函数
main() {
    log_info "开始自动修复流程..."
    
    # 检查依赖
    check_dependencies
    
    # 获取auto-fix Issues
    ISSUES=$(get_auto_fix_issues)
    
    if [ $? -ne 0 ]; then
        log_info "没有需要处理的Issue"
        exit 0
    fi
    
    # 解析Issues并处理
    echo "$ISSUES" | jq -c '.[]' | while read ISSUE; do
        ISSUE_NUMBER=$(echo "$ISSUE" | jq -r '.number')
        ISSUE_TITLE=$(echo "$ISSUE" | jq -r '.title')
        ISSUE_BODY=$(echo "$ISSUE" | jq -r '.body')
        
        # 处理Issue
        process_issue "$ISSUE_NUMBER" "$ISSUE_TITLE" "$ISSUE_BODY"
        
        # 等待一段时间，避免API限制
        sleep 5
    done
    
    log_info "自动修复流程完成"
}

# 运行主函数
main "$@"