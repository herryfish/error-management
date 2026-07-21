# 错题管理系统部署架构文档

## 1. 概述

本文档定义错题管理系统的生产部署架构，基于 Docker Compose 在自有服务器上部署。系统采用移动优先 H5 架构，包含前端、后端、数据库三层服务。

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户设备（手机浏览器）                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx（反向代理 + 静态资源）               │
│                    Port: 80 / 443                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API（应用服务器）                  │
│                    Port: 3000                                │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   MariaDB       │ │   LLM API       │ │   文件存储       │
│   Port: 3306    │ │   (外部服务)     │ │   (本地卷)       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 3. Docker Compose 配置

### 3.1 目录结构

```
deploy/
├── docker-compose.yml          # 主编排文件
├── docker-compose.prod.yml     # 生产环境覆盖配置
├── .env.example                # 环境变量模板（不入库）
├── nginx/
│   ├── nginx.conf              # Nginx 主配置
│   └── conf.d/
│       └── default.conf        # 站点配置
├── scripts/
│   ├── init-db.sh              # 数据库初始化脚本
│   ├── health-check.sh         # 健康检查脚本
│   └── rollback.sh             # 回滚脚本
└── backups/                    # 备份目录（挂载卷）
```

### 3.2 docker-compose.yml

```yaml
version: '3.8'

services:
  # ============================================
  # Nginx - 反向代理与静态资源
  # ============================================
  nginx:
    image: nginx:1.25-alpine
    container_name: cts-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - frontend-dist:/usr/share/nginx/html:ro
      - uploads:/var/www/uploads:ro
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - frontend-net
      - backend-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: '0.25'

  # ============================================
  # Backend - API 服务器
  # ============================================
  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
      target: production
    container_name: cts-backend
    expose:
      - "3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mariadb
      - DB_PORT=3306
      - DB_NAME=${DB_NAME:-errorbook}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - LLM_API_KEY=${LLM_API_KEY}
      - LLM_API_URL=${LLM_API_URL}
      - LLM_ENABLED=${LLM_ENABLED:-true}
      - UPLOAD_DIR=/var/www/uploads
      - LOG_LEVEL=${LOG_LEVEL:-info}
    volumes:
      - uploads:/var/www/uploads
      - ./scripts/init-db.sh:/app/scripts/init-db.sh:ro
    depends_on:
      mariadb:
        condition: service_healthy
    networks:
      - backend-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'

  # ============================================
  # MariaDB - 数据库
  # ============================================
  mariadb:
    image: mariadb:11.2
    container_name: cts-mariadb
    expose:
      - "3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=${DB_NAME:-errorbook}
      - MYSQL_USER=${DB_USER}
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mariadb-data:/var/lib/mysql
      - ./scripts/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh:ro
      - ./backups:/backups
    networks:
      - backend-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

# ============================================
# 数据卷
# ============================================
volumes:
  frontend-dist:
    driver: local
  mariadb-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/mariadb
  uploads:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/uploads

# ============================================
# 网络
# ============================================
networks:
  frontend-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
  backend-net:
    driver: bridge
    internal: true  # 后端网络不暴露到宿主机
    ipam:
      config:
        - subnet: 172.21.0.0/24
```

### 3.3 docker-compose.prod.yml（生产覆盖）

```yaml
version: '3.8'

services:
  nginx:
    ports:
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /etc/nginx/ssl:/etc/nginx/ssl:ro
    command: >
      sh -c "nginx -g 'daemon off;'"

  backend:
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=warn

  mariadb:
    command: >
      --innodb-buffer-pool-size=512M
      --max-connections=100
      --slow-query-log=1
      --long-query-time=2
```

---

## 4. 网络配置

### 4.1 网络分层

| 网络名称 | 子网 | 用途 | 可见性 |
|---------|------|------|--------|
| `frontend-net` | 172.20.0.0/24 | Nginx ↔ Backend | 暴露 80/443 |
| `backend-net` | 172.21.0.0/24 | Backend ↔ MariaDB | 内部网络（不暴露） |

### 4.2 网络隔离策略

```yaml
# 后端网络设置为 internal，禁止外部直接访问数据库
backend-net:
  driver: bridge
  internal: true
```

### 4.3 Nginx 站点配置

```nginx
# nginx/conf.d/default.conf
upstream backend {
    server backend:3000;
}

server {
    listen 80;
    server_name _;

    # 健康检查端点
    location /health {
        access_log off;
        return 200 'OK';
        add_header Content-Type text/plain;
    }

    # 前端静态资源
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 7d;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 代理
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 上传文件访问
    location /uploads/ {
        alias /var/www/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

---

## 5. 环境变量管理

### 5.1 环境变量清单

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| **数据库** | | | |
| `DB_NAME` | 数据库名 | `errorbook` | 否 |
| `DB_USER` | 数据库用户 | - | 是 |
| `DB_PASSWORD` | 数据库密码 | - | 是 |
| `MYSQL_ROOT_PASSWORD` | MariaDB root 密码 | - | 是 |
| **应用** | | | |
| `JWT_SECRET` | JWT 签名密钥 | - | 是 |
| `NODE_ENV` | 运行环境 | `production` | 否 |
| `LOG_LEVEL` | 日志级别 | `info` | 否 |
| **LLM 集成** | | | |
| `LLM_API_KEY` | LLM 服务 API Key | - | 是 |
| `LLM_API_URL` | LLM 服务地址 | - | 是 |
| `LLM_ENABLED` | LLM 功能开关 | `true` | 否 |
| **部署** | | | |
| `DEPLOY_ENV` | 部署环境标识 | `prod` | 否 |

### 5.2 环境变量管理原则

1. **禁止入库**：`.env` 文件添加到 `.gitignore`
2. **模板提供**：`.env.example` 提供变量说明和默认值
3. **服务器注入**：生产环境通过服务器侧 `.env` 文件注入
4. **密钥轮换**：支持通过环境变量覆盖重启生效

### 5.3 .env.example

```bash
# ============================================
# 错题管理系统环境变量配置
# 复制为 .env 后填写实际值
# ============================================

# --- 数据库配置 ---
DB_NAME=errorbook
DB_USER=errorbook_user
DB_PASSWORD=CHANGE_ME_TO_SECURE_PASSWORD
MYSQL_ROOT_PASSWORD=CHANGE_ME_TO_ROOT_PASSWORD

# --- 应用配置 ---
JWT_SECRET=CHANGE_ME_TO_RANDOM_32_CHARS
NODE_ENV=production
LOG_LEVEL=info

# --- LLM 配置 ---
LLM_API_KEY=your_llm_api_key_here
LLM_API_URL=https://api.llm-provider.com/v1
LLM_ENABLED=true

# --- 部署配置 ---
DEPLOY_ENV=prod
```

---

## 6. 健康检查配置

### 6.1 服务健康检查

```yaml
# Nginx 健康检查
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/health"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 10s

# Backend 健康检查
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s

# MariaDB 健康检查
healthcheck:
  test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

### 6.2 健康检查端点设计

```javascript
// Backend /health 端点示例
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: await checkDatabaseHealth(),
      llm: await checkLLMHealth(),
    },
  };

  const isHealthy = Object.values(health.services)
    .every(s => s.status === 'healthy');

  res.status(isHealthy ? 200 : 503).json(health);
});
```

### 6.3 依赖启动顺序

```yaml
# docker-compose.yml 中的依赖关系
services:
  backend:
    depends_on:
      mariadb:
        condition: service_healthy  # 等待数据库健康后启动

  nginx:
    depends_on:
      backend:
        condition: service_healthy  # 等待后端健康后启动
```

### 6.4 外部监控脚本

```bash
#!/bin/bash
# scripts/health-check.sh

set -e

echo "=== 错题管理系统健康检查 ==="
echo "时间: $(date)"

# 检查容器状态
echo -e "\n--- 容器状态 ---"
docker-compose ps

# 检查服务端点
echo -e "\n--- 端点检查 ---"

# Nginx
if curl -sf http://localhost/health > /dev/null; then
    echo "✓ Nginx 健康"
else
    echo "✗ Nginx 异常"
    exit 1
fi

# Backend
if curl -sf http://localhost:3000/health > /dev/null; then
    echo "✓ Backend 健康"
else
    echo "✗ Backend 异常"
    exit 1
fi

# MariaDB
if docker exec cts-mariadb healthcheck.sh --connect > /dev/null 2>&1; then
    echo "✓ MariaDB 健康"
else
    echo "✗ MariaDB 异常"
    exit 1
fi

echo -e "\n=== 所有服务健康 ==="
```

---

## 7. 回滚策略

### 7.1 回滚原则

1. **快速恢复**：优先回滚到上一个稳定版本
2. **数据保护**：数据库回滚需单独评估，优先使用向后兼容迁移
3. **可追溯**：每次回滚需记录原因和操作人

### 7.2 回滚流程

```
发现问题
    │
    ▼
确认回滚必要性
    │
    ├─ 应用层问题 ──→ 执行应用回滚（Docker 镜像）
    │
    ├─ 数据库问题 ──→ 评估迁移兼容性
    │       │
    │       ├─ 可逆迁移 ──→ 执行回滚迁移
    │       │
    │       └─ 不可逆迁移 ──→ 从备份恢复
    │
    └─ 配置问题 ──→ 回滚配置文件 + 重启服务
```

### 7.3 应用回滚脚本

```bash
#!/bin/bash
# scripts/rollback.sh

set -e

# 配置
COMPOSE_FILE="docker-compose.yml"
BACKUP_TAG_FILE=".rollback_tag"
LOG_FILE="/var/log/cts/rollback.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 获取上一个稳定版本标签
get_rollback_tag() {
    if [ -f "$BACKUP_TAG_FILE" ]; then
        cat "$BACKUP_TAG_FILE"
    else
        echo "No previous tag found"
        exit 1
    fi
}

# 保存当前版本标签
save_current_tag() {
    local current_tag=$1
    echo "$current_tag" > "$BACKUP_TAG_FILE"
}

# 执行回滚
rollback() {
    local target_tag=$1

    log "开始回滚到版本: $target_tag"

    # 备份当前配置
    log "备份当前配置..."
    cp "$COMPOSE_FILE" "${COMPOSE_FILE}.bak.$(date +%s)"

    # 更新镜像标签
    log "更新镜像标签..."
    export IMAGE_TAG="$target_tag"

    # 停止当前服务
    log "停止当前服务..."
    docker-compose down

    # 拉取旧版本镜像
    log "拉取版本 $target_tag 镜像..."
    docker-compose pull

    # 启动服务
    log "启动回滚版本..."
    docker-compose up -d

    # 等待健康检查
    log "等待服务健康检查..."
    sleep 30

    # 验证服务状态
    if docker-compose ps | grep -q "healthy"; then
        log "回滚成功！版本: $target_tag"
        save_current_tag "$target_tag"
    else
        log "回滚后健康检查失败，请手动检查"
        exit 1
    fi
}

# 主流程
case "${1:-}" in
    --list)
        echo "可用版本:"
        docker images --format "{{.Repository}}:{{.Tag}}" | grep cts-backend
        ;;
    --auto)
        # 自动回滚到上一个版本
        PREV_TAG=$(get_rollback_tag)
        rollback "$PREV_TAG"
        ;;
    --to)
        if [ -z "${2:-}" ]; then
            echo "用法: $0 --to <version-tag>"
            exit 1
        fi
        rollback "$2"
        ;;
    *)
        echo "用法:"
        echo "  $0 --list          # 列出可用版本"
        echo "  $0 --auto          # 回滚到上一个稳定版本"
        echo "  $0 --to <tag>      # 回滚到指定版本"
        exit 1
        ;;
esac
```

### 7.4 数据库回滚策略

```bash
#!/bin/bash
# scripts/db-rollback.sh

set -e

# 数据库备份目录
BACKUP_DIR="/data/backups/mariadb"

# 创建备份
create_backup() {
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    log "创建数据库备份: $backup_name"

    docker exec cts-mariadb mariadb-dump \
        --user=root \
        --password="$MYSQL_ROOT_PASSWORD" \
        --all-databases \
        --single-transaction \
        --routines \
        --triggers \
        | gzip > "$BACKUP_DIR/$backup_name.sql.gz"

    log "备份完成: $BACKUP_DIR/$backup_name.sql.gz"
}

# 恢复备份
restore_backup() {
    local backup_file=$1

    if [ ! -f "$backup_file" ]; then
        echo "备份文件不存在: $backup_file"
        exit 1
    fi

    log "开始恢复数据库: $backup_file"

    # 停止后端服务（防止写入）
    docker-compose stop backend

    # 恢复数据库
    gunzip -c "$backup_file" | docker exec -i cts-mariadb mariadb \
        --user=root \
        --password="$MYSQL_ROOT_PASSWORD"

    # 重启后端服务
    docker-compose start backend

    log "数据库恢复完成"
}

# 列出备份
list_backups() {
    echo "可用备份:"
    ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "无备份文件"
}

case "${1:-}" in
    backup)
        create_backup
        ;;
    restore)
        if [ -z "${2:-}" ]; then
            echo "用法: $0 restore <backup-file>"
            exit 1
        fi
        restore_backup "$2"
        ;;
    list)
        list_backups
        ;;
    *)
        echo "用法:"
        echo "  $0 backup              # 创建数据库备份"
        echo "  $0 restore <file>      # 恢复指定备份"
        echo "  $0 list                # 列出可用备份"
        exit 1
        ;;
esac
```

### 7.5 CI/CD 集成

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Save current version for rollback
        run: |
          echo "${{ github.sha }}" > .rollback_tag
          cat .rollback_tag

      - name: Build and push Docker image
        run: |
          docker build -t cts-backend:${{ github.sha }} .
          docker push registry.example.com/cts-backend:${{ github.sha }}

      - name: Deploy to production
        run: |
          ssh deploy@server "cd /app && \
            export IMAGE_TAG=${{ github.sha }} && \
            docker-compose pull && \
            docker-compose up -d && \
            sleep 30 && \
            ./scripts/health-check.sh"

      - name: Rollback on failure
        if: failure()
        run: |
          ssh deploy@server "cd /app && \
            ./scripts/rollback.sh --auto"
```

---

## 8. 部署流程

### 8.1 首次部署

```bash
# 1. 克隆代码
git clone https://github.com/your-org/errorbook.git
cd errorbook/deploy

# 2. 配置环境变量
cp .env.example .env
vim .env  # 填写实际值

# 3. 创建数据目录
sudo mkdir -p /data/mariadb /data/uploads /data/backups
sudo chown -R $USER:$USER /data

# 4. 启动服务
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 5. 验证部署
./scripts/health-check.sh
```

### 8.2 日常更新

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 保存当前版本标签
git rev-parse HEAD > .rollback_tag

# 3. 构建新镜像
docker-compose build backend

# 4. 滚动更新
docker-compose up -d --no-deps backend

# 5. 验证
./scripts/health-check.sh
```

### 8.3 紧急回滚

```bash
# 一键回滚到上一个版本
./scripts/rollback.sh --auto

# 或回滚到指定版本
./scripts/rollback.sh --to v1.2.3
```

---

## 9. 数据备份策略

### 9.1 备份计划

| 备份类型 | 频率 | 保留周期 | 备份内容 |
|---------|------|---------|---------|
| 数据库全量备份 | 每日 02:00 | 7 天 | MariaDB 全库 |
| 数据库增量备份 | 每小时 | 24 小时 | binlog |
| 上传文件备份 | 每日 03:00 | 7 天 | /data/uploads |
| 配置文件备份 | 变更时 | 永久 | .env, nginx.conf |

### 9.2 自动备份脚本

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/data/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 数据库备份
docker exec cts-mariadb mariadb-dump \
    --user=root \
    --password="$MYSQL_ROOT_PASSWORD" \
    --all-databases \
    --single-transaction \
    | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# 清理 7 天前的备份
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
```

---

## 10. 监控与告警

### 10.1 监控指标

| 指标 | 阈值 | 告警方式 |
|------|------|---------|
| 容器状态 | 非 running | 邮件/即时通讯 |
| CPU 使用率 | > 80% 持续 5 分钟 | 邮件 |
| 内存使用率 | > 85% | 邮件 |
| 磁盘使用率 | > 90% | 邮件 |
| API 响应时间 | > 2s (P95) | 邮件 |
| 数据库连接数 | > 80 | 邮件 |
| LLM 调用失败率 | > 10% | 邮件 |

### 10.2 日志管理

```yaml
# docker-compose.yml
services:
  backend:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  mariadb:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 11. 安全配置

### 11.1 安全清单

- [ ] 禁止 root 用户运行容器
- [ ] 数据库密码使用强随机值
- [ ] JWT 密钥定期轮换
- [ ] 启用 HTTPS（Let's Encrypt）
- [ ] 配置防火墙规则
- [ ] 限制数据库仅内部网络访问
- [ ] 启用日志审计

### 11.2 SSL/TLS 配置

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 12. 性能优化

### 12.1 MariaDB 优化

```ini
# my.cnf 配置
[mysqld]
innodb_buffer_pool_size = 512M
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
max_connections = 100
slow_query_log = 1
long_query_time = 2
```

### 12.2 Nginx 优化

```nginx
worker_processes auto;
worker_connections 1024;

gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml;
gzip_min_length 1000;
```

---

## 附录 A：快速参考

| 操作 | 命令 |
|------|------|
| 启动服务 | `docker-compose up -d` |
| 停止服务 | `docker-compose down` |
| 查看日志 | `docker-compose logs -f [service]` |
| 健康检查 | `./scripts/health-check.sh` |
| 应用回滚 | `./scripts/rollback.sh --auto` |
| 数据库备份 | `./scripts/backup.sh` |
| 查看状态 | `docker-compose ps` |

---

## 附录 B：故障排查

| 问题 | 排查步骤 |
|------|---------|
| 服务无法启动 | `docker-compose logs [service]` 查看错误日志 |
| 数据库连接失败 | 检查 MariaDB 健康状态，验证用户名密码 |
| API 响应慢 | 检查后端日志，查看数据库慢查询 |
| LLM 调用失败 | 检查 API Key 配置，查看 LLM 服务状态 |
| 磁盘空间不足 | 清理旧备份，检查上传文件目录 |

---

*文档版本: v1.0*
*更新日期: 2026-07-21*
*适用于: 错题管理系统 v1.3*
