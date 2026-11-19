# 错题系统 frontend 生产镜像（DC-481 起改为容器内自构建）
#
# 旧版本直接 COPY 宿主机预构建的 dist/，新 clone 场景下 dist 不存在导致构建失败；
# 现改为在容器内自构建：build context 为仓库根，走根 npm workspaces 安装
# （唯一权威 lockfile 是根 package-lock.json，子 lockfile 已删除）：
#   docker build -f frontend/Dockerfile .
# 运行时行为不变（nginx:alpine + frontend/nginx.conf）。

# ---------- 构建阶段：根 workspace 安装 + vite build ----------
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json

RUN npm ci --workspace frontend

COPY frontend/ ./frontend/

RUN npm run build --workspace frontend

# ---------- 运行阶段 ----------
FROM nginx:alpine

COPY --from=builder /app/frontend/dist /usr/share/nginx/html

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
