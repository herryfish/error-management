# 错题系统 backend 镜像（244 测试环境用，DC-478）
#
# 背景：backend/package-lock.json 与 package.json 已失同步（子 lockfile 不再维护，
# 唯一权威 lockfile 是根 package-lock.json，见 .github/workflows/auto-review.yml 注释），
# backend/Dockerfile 里的 `npm ci` 在新 clone 的容器内构建会因 EUSAGE 失败
# （实测缺 bullmq / ioredis / ts-fsrs / openai 等）。
# 本文件以仓库根为 build context，走 npm workspaces 安装（与 CI 一致）：
#   docker build -f deploy/backend.Dockerfile .
# compose 侧通过 docker-compose.override.yml（gitignored，仅 244 部署目录存在）
# 将 services.backend.build 指向本文件，不影响生产构建路径。

# ---------- 构建阶段：根 workspace 安装 + tsc ----------
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json

RUN npm ci --workspace backend

COPY backend/ ./backend/

RUN npm run build --workspace backend

# ---------- 运行阶段：布局与 backend/Dockerfile 保持一致 ----------
# WORKDIR /app + /app/dist + /app/node_modules + /app/uploads，
# 使 compose 的 uploads 卷挂载（uploads:/app/uploads）与
# `npm run migrate`（typeorm migration:run -d dist/config/database.js）无需任何改动。
FROM node:18-alpine

WORKDIR /app

COPY backend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist

RUN mkdir -p /app/uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { if (r.statusCode !== 200) process.exit(1); })" || exit 1

CMD ["node", "dist/index.js"]
