#!/bin/bash
# deploy-test.sh - 手动部署到测试环境

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== 部署到测试环境 ===${NC}"
echo ""

# 检查Docker是否可用
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Docker 未安装"
    exit 1
fi

# 开始部署
echo -e "${GREEN}[INFO]${NC} 开始部署..."
echo ""

# 1. 构建Docker镜像
echo -e "${GREEN}[INFO]${NC} 构建Docker镜像..."
docker compose build --no-cache 2>&1 | tail -10

if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Docker镜像构建失败"
    exit 1
fi

# 2. 停止旧容器
echo -e "${GREEN}[INFO]${NC} 停止旧容器..."
docker compose down 2>&1 | tail -3

# 3. 启动新容器
echo -e "${GREEN}[INFO]${NC} 启动新容器..."
docker compose up -d 2>&1 | tail -10

# 4. 等待服务启动
echo -e "${GREEN}[INFO]${NC} 等待服务启动..."
sleep 15

# 5. 检查服务状态
echo -e "${GREEN}[INFO]${NC} 检查服务状态..."
docker compose ps

# 6. 测试服务
echo ""
echo -e "${GREEN}[INFO]${NC} 测试服务..."

# 测试后端
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}[SUCCESS]${NC} 后端服务正常"
else
    echo -e "${RED}[ERROR]${NC} 后端服务异常"
fi

# 测试前端
if curl -f http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}[SUCCESS]${NC} 前端服务正常"
else
    echo -e "${RED}[ERROR]${NC} 前端服务异常"
fi

# 测试Nginx
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo -e "${GREEN}[SUCCESS]${NC} Nginx服务正常"
else
    echo -e "${RED}[ERROR]${NC} Nginx服务异常"
fi

# 7. 显示部署信息
echo ""
echo -e "${GREEN}=== 部署完成 ===${NC}"
echo "测试环境地址:"
echo "  前端: http://localhost:3001"
echo "  后端API: http://localhost:3000"
echo "  Nginx: http://localhost:80"
echo ""
echo "查看日志: docker compose logs -f"
echo "停止服务: docker compose down"