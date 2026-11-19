#!/usr/bin/env bash
# =====================================================================
# 错题系统测试环境（244）一键更新脚本 — DC-478（方案甲）
# 部署目录：/opt/error-management-test（独立于生产 CD 的 /opt/error-management）
#
# 流程：git 同步 origin/master
#   → 根 workspace 构建前端 dist（宿主无 Node 18 时用一次性 node:18-alpine 容器）
#   → docker compose build（backend 经 override 使用 deploy/backend.Dockerfile）
#   → npm run migrate（迁移不随容器启动自动执行）
#   → up -d 滚动更新 → 健康检查
#
# 端口规划（docker-compose.override.yml，gitignored，仅存在于 244 部署目录）：
#   nginx 8080→80（唯一对外入口）；frontend 3001→80（直连验证用）；
#   backend/mariadb/redis 不映射宿主端口——244 上 80/443/3000/3307/6379 已被
#   现有服务占用，宿主 3000 是 multica 平台入口，绝不可占用。
#
# 构建 vs 旧 backend/Dockerfile 的差异（为何要走根 workspace）：
#   frontend/package-lock.json、backend/package-lock.json 与各自 package.json
#   已失同步（子 lockfile 不再维护，唯一权威 lockfile 是根 package-lock.json，
#   见 .github/workflows/auto-review.yml 注释），容器内 npm ci 会因 EUSAGE 失败
#   （实测缺 vitest / bullmq / ioredis / ts-fsrs 等）。故前端在仓库根安装构建，
#   backend 镜像由 deploy/backend.Dockerfile 以仓库根为 context 构建。
#
# 用法：cd /opt/error-management-test && ./deploy/update-test.sh
# =====================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

NGINX_PORT="${NGINX_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-3001}"

echo "==> 1/6 同步最新代码（以远端 master 为准；.env 与 docker-compose.override.yml 为 gitignore 文件，不受影响）"
git fetch origin master
git reset --hard origin/master

echo "==> 2/6 构建前端产物（npm workspaces：唯一权威 lockfile 是根 package-lock.json）"
if command -v node >/dev/null 2>&1 && [ "$(node -v | sed 's/^v\([0-9]*\).*/\1/')" -ge 18 ]; then
  npm ci
  npm run build --workspace frontend
else
  docker run --rm -v "$PWD":/app -w /app node:18-alpine sh -c "npm ci && npm run build --workspace frontend"
fi
[ -f frontend/dist/index.html ] || { echo "✗ frontend/dist/index.html 缺失，前端构建失败"; exit 1; }

echo "==> 3/6 构建镜像（layer 缓存，仅重建变化部分）"
docker compose build

echo "==> 4/6 数据库迁移（新镜像临时容器执行，schema 与新代码同步生效）"
docker compose run --rm backend npm run migrate

echo "==> 5/6 滚动更新（仅重建有变化的容器；数据在命名卷中不丢失）"
docker compose up -d
docker image prune -f >/dev/null 2>&1 || true

echo "==> 6/6 健康检查（最长等待 90s：backend 容器内 3000 / nginx:${NGINX_PORT} / frontend:${FRONTEND_PORT}）"
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
