#!/bin/bash
# simple-test.sh - 简单测试脚本

set -e

REPO_DIR="/root/workspaces/proj1"

echo "=== 测试本地AI自动修复流程 ==="

# 1. 检查GitHub上的auto-fix Issues
echo ""
echo "1. 检查GitHub上的auto-fix Issues..."
cd "$REPO_DIR"
ISSUES=$(gh issue list --label "auto-fix" --state open --json number,title --limit 3)

if [ -z "$ISSUES" ] || [ "$ISSUES" = "[]" ]; then
    echo "没有找到auto-fix Issues"
    exit 0
fi

echo "找到以下Issues:"
echo "$ISSUES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for issue in data:
    print(f\"  - #{issue['number']}: {issue['title']}\")
"

# 2. 测试创建修复分支
echo ""
echo "2. 测试创建修复分支..."
TEST_ISSUE_NUMBER=999
BRANCH_NAME="fix/issue-$TEST_ISSUE_NUMBER"

# 切回master分支
git checkout master 2>/dev/null || true

# 删除测试分支（如果存在）
git branch -D "$BRANCH_NAME" 2>/dev/null || true

# 创建新分支
git checkout -b "$BRANCH_NAME"
echo "分支 $BRANCH_NAME 创建成功"

# 3. 测试创建修复文档
echo ""
echo "3. 测试创建修复文档..."
cat > "FIX_ISSUE_${TEST_ISSUE_NUMBER}.md" << EOF
# Issue #${TEST_ISSUE_NUMBER} 修复记录

## 修复时间
$(date -u +"%Y-%m-%d %H:%M:%S UTC")

## 修复说明
这是一个测试修复文档，用于验证自动修复流程。
EOF

echo "修复文档创建成功"

# 4. 测试提交更改
echo ""
echo "4. 测试提交更改..."
git add -A
git commit -m "fix: 测试自动修复流程"

# 5. 测试推送分支
echo ""
echo "5. 测试推送分支..."
git push --force-with-lease origin "$BRANCH_NAME" || echo "推送失败（可能是权限问题）"

# 6. 测试创建PR
echo ""
echo "6. 测试创建PR..."
gh pr create \
    --base master \
    --head "$BRANCH_NAME" \
    --title "fix: 测试自动修复流程" \
    --body "## 测试

这是一个测试PR，用于验证自动修复流程。" \
    --label "auto-fix" || echo "PR创建失败（可能是权限问题）"

# 7. 清理
echo ""
echo "7. 清理..."
git checkout master
git branch -D "$BRANCH_NAME" 2>/dev/null || true

echo ""
echo "=== 测试完成 ==="