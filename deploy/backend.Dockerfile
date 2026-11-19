# 错题系统 backend 镜像（244 测试环境用，DC-478；DC-481 起与生产路径同机制）
#
# DC-481 已修复构建失同步：生产 backend/Dockerfile 与本文件均以仓库根为 build
# context，走根 npm workspaces 安装（唯一权威 lockfile 是根 package-lock.json，
# 子 lockfile 已删除）。两者构建逻辑保持一致，本文件保留是因 244 部署目录的
# docker-compose.override.yml（gitignored）将 services.backend.build 指向本文件，
# 与生产路径等价，不影响任何行为。
#   docker build -f deploy/backend.Dockerfile .

# ---------- 构建阶段：根 workspace 安装 + tsc（与 backend/Dockerfile 保持一致） ----------
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
