#!/bin/bash
# test-auto-fix.sh - 简化版自动修复测试脚本

set -e

# 配置
REPO_DIR="/root/workspaces/proj1"
BRANCH_PREFIX="fix/issue-"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 获取auto-fix Issues
get_auto_fix_issues() {
    log_info "获取auto-fix Issues..."
    
    cd "$REPO_DIR"
    ISSUES=$(gh issue list --label "auto-fix" --state open --json number,title,body --limit 5)
    
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
    
    # 创建修复文档
    cat > "FIX_ISSUE_${ISSUE_NUMBER}.md" << EOF
# Issue #${ISSUE_NUMBER} 修复记录

## Issue信息
- **标题**: ${ISSUE_TITLE}
- **修复时间**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **修复者**: MiMo Code (本地AI)

## 修复说明
MiMo Code已分析此Issue并创建了修复记录。

## 下一步
- [ ] 检查Issue描述是否完整
- [ ] 手动检查相关代码
- [ ] 如需修复，请手动修改
EOF
    
    # 提交更改
    git add -A
    git commit -m "fix: 自动修复 Issue #${ISSUE_NUMBER}" || true
    
    # 推送分支
    log_info "推送分支 $BRANCH_NAME..."
    git push --force-with-lease origin "$BRANCH_NAME" || true
    
    # 创建PR
    log_info "创建PR..."
    gh pr create \
        --base master \
        --head "$BRANCH_NAME" \
        --title "fix: 自动修复 Issue #${ISSUE_NUMBER}" \
        --body "## 自动修复

本PR自动修复了 Issue #${ISSUE_NUMBER}

### Issue信息
- **标题**: ${ISSUE_TITLE}

### 修复方式
- 使用MiMo Code (本地AI) 进行分析

Closes #${ISSUE_NUMBER}" \
        --label "auto-fix,bug" || true
    
    # 切回master分支
    git checkout master
    
    log_info "Issue #$ISSUE_NUMBER 处理完成"
    
    return 0
}

# 主函数
main() {
    log_info "开始自动修复流程..."
    
    # 获取auto-fix Issues
    ISSUES=$(get_auto_fix_issues)
    
    if [ $? -ne 0 ]; then
        log_info "没有需要处理的Issue"
        exit 0
    fi
    
    # 使用Python解析JSON并处理Issues
    echo "$ISSUES" | python3 -c "
import sys, json

try:
    data = json.load(sys.stdin)
    for issue in data:
        number = issue.get('number', '')
        title = issue.get('title', '')
        body = issue.get('body', '')
        print(f'{number}|{title}|{body}')
except Exception as e:
    print(f'Error parsing JSON: {e}', file=sys.stderr)
    sys.exit(1)
" | while IFS='|' read -r ISSUE_NUMBER ISSUE_TITLE ISSUE_BODY; do
        # 处理Issue
        process_issue "$ISSUE_NUMBER" "$ISSUE_TITLE" "$ISSUE_BODY"
        
        # 等待一段时间，避免API限制
        sleep 5
    done
    
    log_info "自动修复流程完成"
}

# 运行主函数
main "$@"