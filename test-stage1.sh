#!/bin/bash

echo "=== 阶段1测试脚本 ==="
echo ""

# 测试1: 检查项目结构
echo "1. 检查项目结构..."
if [ -d "frontend" ] && [ -d "backend" ] && [ -d "database" ] && [ -d "design" ]; then
    echo "✅ 项目目录结构正确"
else
    echo "❌ 项目目录结构不完整"
fi

# 测试2: 检查前端依赖安装
echo ""
echo "2. 检查前端依赖..."
if [ -d "frontend/node_modules" ]; then
    echo "✅ 前端依赖已安装"
else
    echo "❌ 前端依赖未安装"
fi

# 测试3: 检查前端构建
echo ""
echo "3. 检查前端构建..."
if [ -d "frontend/dist" ]; then
    echo "✅ 前端构建成功"
else
    echo "❌ 前端构建失败"
fi

# 测试4: 检查后端依赖安装
echo ""
echo "4. 检查后端依赖..."
if [ -d "backend/node_modules" ]; then
    echo "✅ 后端依赖已安装"
else
    echo "❌ 后端依赖未安装"
fi

# 测试5: 检查后端构建
echo ""
echo "5. 检查后端构建..."
if [ -d "backend/dist" ]; then
    echo "✅ 后端构建成功"
else
    echo "❌ 后端构建失败"
fi

# 测试6: 检查Docker Compose配置
echo ""
echo "6. 检查Docker Compose配置..."
if [ -f "docker-compose.yml" ]; then
    echo "✅ Docker Compose配置文件存在"
else
    echo "❌ Docker Compose配置文件不存在"
fi

# 测试7: 检查环境变量配置
echo ""
echo "7. 检查环境变量配置..."
if [ -f ".env.example" ]; then
    echo "✅ 环境变量示例文件存在"
else
    echo "❌ 环境变量示例文件不存在"
fi

# 测试8: 检查GitHub Actions工作流
echo ""
echo "8. 检查CI/CD配置..."
if [ -f ".github/workflows/ci.yml" ]; then
    echo "✅ GitHub Actions工作流配置存在"
else
    echo "❌ GitHub Actions工作流配置不存在"
fi

# 测试9: 检查数据库迁移
echo ""
echo "9. 检查数据库迁移..."
if [ -f "database/migrations/1710000000000-InitialSchema.ts" ]; then
    echo "✅ 数据库迁移文件存在"
else
    echo "❌ 数据库迁移文件不存在"
fi

# 测试10: 检查文档
echo ""
echo "10. 检查文档..."
if [ -f "README.md" ] && [ -f "AGENTS.md" ] && [ -f "implementation_plan.md" ]; then
    echo "✅ 文档文件完整"
else
    echo "❌ 文档文件不完整"
fi

echo ""
echo "=== 测试完成 ==="