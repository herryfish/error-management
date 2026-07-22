#!/bin/bash
# setup-cron.sh - 设置定时任务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTO_FIX_SCRIPT="$SCRIPT_DIR/auto-fix-local.sh"
LOG_FILE="/var/log/auto-fix.log"

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
    
    if ! command -v crontab &> /dev/null; then
        log_error "crontab 未安装"
        exit 1
    fi
    
    if [ ! -f "$AUTO_FIX_SCRIPT" ]; then
        log_error "自动修复脚本不存在: $AUTO_FIX_SCRIPT"
        exit 1
    fi
    
    log_info "依赖检查通过"
}

# 设置定时任务
setup_cron() {
    log_info "设置定时任务..."
    
    # 确保脚本可执行
    chmod +x "$AUTO_FIX_SCRIPT"
    
    # 创建日志文件
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"
    
    # 获取现有crontab
    EXISTING_CRON=$(crontab -l 2>/dev/null || true)
    
    # 检查是否已存在定时任务
    if echo "$EXISTING_CRON" | grep -q "$AUTO_FIX_SCRIPT"; then
        log_warn "定时任务已存在，跳过设置"
        return 0
    fi
    
    # 添加定时任务（每小时执行一次）
    NEW_CRON="$EXISTING_CRON
# 自动修复任务 - 每小时执行一次
0 * * * * $AUTO_FIX_SCRIPT >> $LOG_FILE 2>&1"
    
    # 更新crontab
    echo "$NEW_CRON" | crontab -
    
    log_info "定时任务设置成功"
    log_info "执行频率: 每小时一次"
    log_info "日志文件: $LOG_FILE"
}

# 显示当前定时任务
show_cron() {
    log_info "当前定时任务:"
    crontab -l 2>/dev/null | grep -E "(auto-fix|修复)" || echo "没有找到相关定时任务"
}

# 移除定时任务
remove_cron() {
    log_info "移除定时任务..."
    
    # 获取现有crontab
    EXISTING_CRON=$(crontab -l 2>/dev/null || true)
    
    # 移除定时任务
    NEW_CRON=$(echo "$EXISTING_CRON" | grep -v "$AUTO_FIX_SCRIPT")
    
    # 更新crontab
    echo "$NEW_CRON" | crontab -
    
    log_info "定时任务已移除"
}

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  setup     设置定时任务"
    echo "  remove    移除定时任务"
    echo "  show      显示当前定时任务"
    echo "  help      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 setup    # 设置定时任务"
    echo "  $0 remove   # 移除定时任务"
    echo "  $0 show     # 显示当前定时任务"
}

# 主函数
main() {
    local ACTION=${1:-help}
    
    case $ACTION in
        setup)
            check_dependencies
            setup_cron
            ;;
        remove)
            remove_cron
            ;;
        show)
            show_cron
            ;;
        help|*)
            show_help
            ;;
    esac
}

# 运行主函数
main "$@"