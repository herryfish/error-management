# 错题系统 backend 生产镜像（DC-481 起统一走根 workspace 构建）
#
# 唯一权威 lockfile 是根 package-lock.json（backend/frontend 子 lockfile 已删除，
# 见 .github/workflows/auto-review.yml 注释与 README）。build context 必须是仓库根
# （docker-compose.yml 中 services.backend.build 已按此配置）：
#   docker build -f backend/Dockerfile .
# 运行时布局与旧镜像完全一致（WORKDIR /app + dist + node_modules + uploads），
# compose 的 uploads 卷挂载与 `npm run migrate` 无需任何改动。

# ---------- 构建阶段：根 workspace 安装 + tsc ----------
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json

RUN npm ci --workspace backend

COPY backend/ ./backend/

RUN npm run build --workspace backend

# ---------- 运行阶段：布局与历史镜像保持一致 ----------
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
