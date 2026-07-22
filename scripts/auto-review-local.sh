#!/bin/bash
# auto-review-local.sh - 使用MiMo Code的本地AI自动审查脚本

set -e

# 配置
REPO_DIR="/root/workspaces/proj1"
GITHUB_REPO="herryfish/error-management"

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
    
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 未安装"
        exit 1
    fi
    
    log_info "依赖检查通过"
}

# 获取待审查的PR
get_pending_prs() {
    log_info "获取待审查的PR..."
    
    cd "$REPO_DIR"
    PRS=$(gh pr list --state open --json number,title,body,headRefName,author --limit 10)
    
    if [ -z "$PRS" ] || [ "$PRS" = "[]" ]; then
        log_info "没有找到待审查的PR"
        return 1
    fi
    
    echo "$PRS"
}

# 审查单个PR
review_pr() {
    local PR_NUMBER=$1
    local PR_TITLE=$2
    local PR_BODY=$3
    local PR_BRANCH=$4
    local PR_AUTHOR=$5
    
    log_info "审查PR #$PR_NUMBER: $PR_TITLE"
    
    cd "$REPO_DIR"
    
    # 检查PR分支是否存在
    if ! git branch -a | grep -q "$PR_BRANCH"; then
        log_warn "PR分支 $PR_BRANCH 不存在，跳过"
        return 1
    fi
    
    # 切换到PR分支
    git checkout "$PR_BRANCH" 2>/dev/null || git checkout -b "$PR_BRANCH" "origin/$PR_BRANCH"
    
    # 创建MiMo Code的审查提示词
    local PROMPT=$(mktemp -t mimo-review.XXXXXX)
    cat > "$PROMPT" << EOF
你是一个代码审查专家。请审查以下Pull Request的代码更改。

## PR信息
- 编号: #$PR_NUMBER
- 标题: $PR_TITLE
- 描述: $PR_BODY
- 作者: $PR_AUTHOR

## 审查任务
1. 检查代码质量
2. 检查是否有潜在问题
3. 检查是否符合编码规范
4. 检查是否有安全漏洞
5. 给出审查意见

## 审查标准
- 代码是否清晰可读
- 是否有潜在的bug
- 是否符合项目编码规范
- 是否有安全隐患
- 是否需要修改

请给出你的审查意见，包括：
1. 总体评价（通过/需要修改/拒绝）
2. 发现的问题列表
3. 改进建议
EOF
    
    # 使用MiMo Code审查代码
    log_info "调用MiMo Code审查代码..."
    
    MIMOCODE_HOME=$(mktemp -d) mimo run \
        --format json \
        --dangerously-skip-permissions \
        --dir "$REPO_DIR" \
        < "$PROMPT" > /tmp/mimo-review.jsonl 2>&1
    
    local EXIT_CODE=$?
    
    # 清理提示词文件
    rm -f "$PROMPT"
    
    if [ $EXIT_CODE -ne 0 ]; then
        log_error "MiMo Code审查失败 (exit code: $EXIT_CODE)"
        return 1
    fi
    
    # 提取审查意见
    local REVIEW_CONTENT=$(grep '"type":"text"' /tmp/mimo-review.jsonl | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        data = json.loads(line)
        if data.get('type') == 'text':
            print(data.get('part', {}).get('text', ''))
    except:
        pass
" 2>/dev/null | head -50)
    
    # 判断审查结果
    local REVIEW_STATUS="approve"
    if echo "$REVIEW_CONTENT" | grep -qi "需要修改\|request changes\|拒绝\|reject"; then
        REVIEW_STATUS="request_changes"
    fi
    
    # 切回master分支
    git checkout master 2>/dev/null || true
    
    # 根据审查结果执行操作
    if [ "$REVIEW_STATUS" = "approve" ]; then
        log_info "审查通过，批准PR"
        gh pr review $PR_NUMBER --approve --body "## ✅ 本地AI审查通过

**审查时间**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**审查工具**: MiMo Code (本地AI)

### 审查结果
代码质量良好，符合项目规范，可以合并。

### 审查意见
$REVIEW_CONTENT"
    else
        log_info "审查需要修改，请求修改"
        gh pr review $PR_NUMBER --request-changes --body "## ⚠️ 本地AI审查：需要修改

**审查时间**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**审查工具**: MiMo Code (本地AI)

### 审查结果
代码需要修改以下问题：

$REVIEW_CONTENT

### 修改建议
请根据以上意见修改代码后重新提交。"
    fi
    
    log_info "PR #$PR_NUMBER 审查完成"
    
    return 0
}

# 主函数
main() {
    log_info "开始PR审查流程..."
    
    # 检查依赖
    check_dependencies
    
    # 获取待审查的PR
    PRS=$(get_pending_prs)
    
    if [ $? -ne 0 ]; then
        log_info "没有需要审查的PR"
        exit 0
    fi
    
    # 使用Python解析JSON并处理PRs
    echo "$PRS" | python3 -c "
import sys, json

try:
    data = json.load(sys.stdin)
    for pr in data:
        number = pr.get('number', '')
        title = pr.get('title', '')
        body = pr.get('body', '')
        branch = pr.get('headRefName', '')
        author = pr.get('author', {}).get('login', '')
        print(f'{number}|{title}|{body}|{branch}|{author}')
except Exception as e:
    print(f'Error parsing JSON: {e}', file=sys.stderr)
    sys.exit(1)
" | while IFS='|' read -r PR_NUMBER PR_TITLE PR_BODY PR_BRANCH PR_AUTHOR; do
        # 审查PR
        review_pr "$PR_NUMBER" "$PR_TITLE" "$PR_BODY" "$PR_BRANCH" "$PR_AUTHOR"
        
        # 等待一段时间，避免API限制
        sleep 5
    done
    
    log_info "PR审查流程完成"
}

# 运行主函数
main "$@"