#!/usr/bin/env bash
# =====================================================================
# 错题系统测试环境（244）一键更新脚本 — DC-478（方案甲），DC-481 起简化
# 部署目录：/opt/error-management-test（独立于生产 CD 的 /opt/error-management）
#
# 流程：git 同步 origin/master
#   → docker compose build（DC-481 起 backend/frontend 镜像均以仓库根为
#     context、容器内走根 npm workspaces 自构建，唯一权威 lockfile 是
#     根 package-lock.json；子 lockfile 已删除，宿主机无需安装 Node）
#   → npm run migrate（迁移不随容器启动自动执行）
#   → up -d 滚动更新 → 健康检查
#
# 端口规划（docker-compose.override.yml，gitignored，仅存在于 244 部署目录）：
#   nginx 8080→80（唯一对外入口）；frontend 3001→80（直连验证用）；
#   backend/mariadb/redis 不映射宿主端口——244 上 80/443/3000/3307/6379 已被
#   现有服务占用，宿主 3000 是 multica 平台入口，绝不可占用。
#   override 同时将 backend build 指向 deploy/backend.Dockerfile，与生产
#   backend/Dockerfile 同机制（根 workspace 自构建），保留以兼容既有部署目录。
#
# 用法：cd /opt/error-management-test && ./deploy/update-test.sh
# =====================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

NGINX_PORT="${NGINX_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-3001}"

echo "==> 1/5 同步最新代码（以远端 master 为准；.env 与 docker-compose.override.yml 为 gitignore 文件，不受影响）"
git fetch origin master
git reset --hard origin/master

echo "==> 2/5 构建镜像（backend/frontend 容器内自构建，走根 npm workspaces，layer 缓存仅重建变化部分）"
docker compose build

echo "==> 3/5 数据库迁移（新镜像临时容器执行，schema 与新代码同步生效）"
docker compose run --rm backend npm run migrate

echo "==> 4/5 滚动更新（仅重建有变化的容器；数据在命名卷中不丢失）"
docker compose up -d
docker image prune -f >/dev/null 2>&1 || true

echo "==> 5/5 健康检查（最长等待 90s：backend 容器内 3000 / nginx:${NGINX_PORT} / frontend:${FRONTEND_PORT}）"
healthy=""
for i in $(seq 1 45); do
  if docker compose exec -T backend wget -qO- http://localhost:3000/health >/dev/null 2>&1 \
     && curl -fsS "http://localhost:${NGINX_PORT}/health" >/dev/null 2>&1 \
     && curl -fsS "http://localhost:${FRONTEND_PORT}/" >/dev/null 2>&1 \
     && curl -fsS "http://localhost:${NGINX_PORT}/" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 2
done
if [ -z "$healthy" ]; then
  echo "✗ 健康检查未通过，各服务状态与最近日志："
  docker compose ps
  docker compose logs --tail 40 backend frontend nginx
  exit 1
fi
echo "✅ 全部健康：backend /health、nginx:${NGINX_PORT} 反代 /health、frontend:${FRONTEND_PORT} 直连、nginx:${NGINX_PORT} 入口"

echo "==> 更新完成：$(git describe --tags --always 2>/dev/null || git rev-parse --short HEAD)"
echo "==> 访问入口：http://192.168.71.244:${NGINX_PORT}"
