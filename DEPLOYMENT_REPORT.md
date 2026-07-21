# 错题管理系统部署报告

## 部署概览

| 项目 | 详情 |
|------|------|
| **项目名称** | 错题管理系统 |
| **版本** | v1.0 |
| **部署时间** | 2026-07-21 |
| **部署状态** | ✅ 成功 |
| **测试状态** | ✅ 全部通过 |

## 服务状态

| 服务 | 状态 | 端口 | 说明 |
|------|------|------|------|
| **MariaDB** | ✅ 健康 | 3306 | 数据库服务 |
| **Backend** | ✅ 运行中 | 3000 | Node.js API服务 |
| **Frontend** | ✅ 健康 | 3001 | Vue.js前端应用 |
| **Nginx** | ✅ 健康 | 80/443 | 反向代理 |

## 功能模块

### 已完成的功能
1. **用户认证系统** ✅
   - 用户注册（学生、家长、管理员）
   - 用户登录（JWT认证）
   - 角色权限控制
   - 学生-家长绑定

2. **错题管理系统** ✅
   - 错题录入（手动、拍照识别）
   - 错题查询和搜索
   - 错题编辑和删除
   - 知识点标签

3. **学习管理系统** ✅
   - 重做记录管理
   - 掌握状态机（连续3次做对，间隔1/7/30天）
   - 复习队列推荐
   - 今日任务生成

4. **报告系统** ✅
   - 周报生成
   - 统计信息
   - 家长只读访问
   - 站内通知

5. **LLM智能功能** ✅
   - 错题识别（多模态LLM）
   - 手写批改
   - 相似题生成
   - 用量监控
   - 多提供商配置和降级策略

6. **工程自动化** ✅
   - 变更流程管理
   - 审批状态机
   - 监控告警
   - 健康检查

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Vue 3 + TypeScript + Pinia + Vant |
| **后端** | Node.js + Express + TypeORM |
| **数据库** | MariaDB |
| **部署** | Docker Compose + GitHub Actions |
| **LLM** | 支持多提供商配置（OpenAI、Anthropic等） |

## 数据库表

| 表名 | 说明 |
|------|------|
| users | 用户表 |
| students | 学生表 |
| parents | 家长表 |
| questions | 错题表 |
| redo_records | 重做记录表 |
| mastery | 掌握状态表 |
| similar_questions | 相似题表 |
| llm_usage | LLM用量表 |
| notifications | 通知表 |
| weekly_reports | 周报表 |
| sys_config | 系统配置表 |
| change_requests | 变更请求表 |
| monitor_logs | 监控日志表 |
| migrations | 迁移记录表 |

## API端点

### 认证相关
- POST /api/auth/register - 用户注册
- POST /api/auth/login - 用户登录
- POST /api/auth/refresh-token - 刷新令牌
- POST /api/auth/logout - 用户登出
- GET /api/auth/me - 获取当前用户信息
- POST /api/auth/bind - 绑定学生-家长关系
- POST /api/auth/unlink - 解绑学生-家长关系

### 错题管理
- GET /api/questions - 获取错题列表
- GET /api/questions/:id - 获取错题详情
- POST /api/questions - 创建错题
- PUT /api/questions/:id - 更新错题
- DELETE /api/questions/:id - 删除错题
- POST /api/questions/identify - AI识别错题
- GET /api/questions/student/:studentId - 获取学生错题
- GET /api/questions/search - 搜索错题
- GET /api/questions/stats/:studentId - 获取错题统计

### 重做管理
- GET /api/redos - 获取重做列表
- GET /api/redos/:id - 获取重做详情
- POST /api/redos - 创建在线重做
- POST /api/redos/photo - 创建拍照重做
- PUT /api/redos/:id/grade - 批改重做
- PUT /api/redos/:id/remark - 学生改判
- GET /api/redos/student/:studentId - 获取学生重做
- GET /api/redos/question/:questionId - 获取题目重做

### 掌握状态
- GET /api/mastery - 获取掌握列表
- GET /api/mastery/:id - 获取掌握详情
- POST /api/mastery - 创建掌握记录
- PUT /api/mastery/:id - 更新掌握记录
- PUT /api/mastery/:id/review - 复习掌握记录
- GET /api/mastery/student/:studentId - 获取学生掌握
- GET /api/mastery/student/:studentId/queue - 获取复习队列
- GET /api/mastery/student/:studentId/stats - 获取掌握统计
- GET /api/mastery/question/:questionId - 获取题目掌握

### 相似题
- GET /api/similar - 获取相似题列表
- GET /api/similar/:id - 获取相似题详情
- POST /api/similar - 生成相似题
- PUT /api/similar/:id/apply - 标记为适用
- PUT /api/similar/:id/not-apply - 标记为不适用
- GET /api/similar/question/:questionId - 获取题目相似题
- GET /api/similar/student/:studentId - 获取学生相似题

### 报告系统
- GET /api/reports/weekly - 获取周报
- GET /api/reports/weekly/:userId - 获取用户周报
- GET /api/reports/stats - 获取统计信息
- GET /api/reports/stats/:userId - 获取用户统计
- GET /api/reports/student/:studentId/daily - 获取日报
- GET /api/reports/student/:studentId/weekly - 获取学生周报
- GET /api/reports/parent/:parentId/child - 获取孩子报告

### LLM服务
- GET /api/llm/usage - 获取LLM用量
- GET /api/llm/usage/:userId - 获取用户LLM用量
- GET /api/llm/usage/summary - 获取LLM用量汇总
- GET /api/llm/config - 获取LLM配置
- PUT /api/llm/config - 更新LLM配置

### 变更流程
- GET /api/change-requests - 获取变更列表
- GET /api/change-requests/stats - 获取变更统计
- GET /api/change-requests/:id - 获取变更详情
- POST /api/change-requests - 创建变更请求
- PUT /api/change-requests/:id/approve - 审批变更
- PUT /api/change-requests/:id/reject - 拒绝变更
- PUT /api/change-requests/:id/status - 更新变更状态

### 监控告警
- GET /api/monitor/health - 健康检查
- GET /api/monitor - 获取监控日志
- GET /api/monitor/stats - 获取监控统计
- GET /api/monitor/:id - 获取日志详情
- POST /api/monitor - 创建监控日志
- PUT /api/monitor/:id/acknowledge - 确认日志

### 管理员
- GET /api/admin/users - 获取用户列表
- GET /api/admin/users/:id - 获取用户详情
- PUT /api/admin/users/:id - 更新用户
- DELETE /api/admin/users/:id - 删除用户
- GET /api/admin/questions - 获取错题列表
- GET /api/admin/questions/:id - 获取错题详情
- GET /api/admin/stats - 获取系统统计
- GET /api/admin/health - 获取系统健康
- GET /api/admin/config - 获取系统配置
- PUT /api/admin/config - 更新系统配置

## 访问地址

| 地址 | 说明 |
|------|------|
| http://localhost:80 | Nginx反向代理（推荐） |
| http://localhost:3001 | 前端直接访问 |
| http://localhost:3000 | 后端API |

## 默认用户

| 用户名 | 密码 | 角色 |
|--------|------|------|
| test_student | password123 | 学生 |
| test_parent | password123 | 家长 |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DB_HOST | 数据库主机 | mariadb |
| DB_PORT | 数据库端口 | 3306 |
| DB_USERNAME | 数据库用户名 | root |
| DB_PASSWORD | 数据库密码 | password |
| DB_DATABASE | 数据库名 | error_management |
| JWT_SECRET | JWT密钥 | your-jwt-secret |
| JWT_EXPIRES_IN | JWT过期时间 | 7d |
| CORS_ORIGIN | CORS来源 | http://localhost:3001 |
| LLM_PRIMARY_PROVIDER | 主LLM提供商 | openai |
| LLM_PRIMARY_MODEL | 主LLM模型 | gpt-4-vision-preview |
| LLM_PRIMARY_API_KEY | 主LLM API密钥 | - |
| LLM_FALLBACK_PROVIDER | 降级LLM提供商 | - |
| LLM_FALLBACK_MODEL | 降级LLM模型 | - |
| LLM_FALLBACK_API_KEY | 降级LLM API密钥 | - |

## 部署命令

```bash
# 克隆项目
git clone <repository-url>
cd error-management

# 配置环境变量
cp .env.example .env
# 编辑.env文件配置LLM API密钥等

# 启动服务
docker-compose up -d

# 运行数据库迁移
docker-compose exec backend npm run migrate

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 测试结果

| 测试项 | 状态 |
|--------|------|
| 服务健康检查 | ✅ 通过 |
| 用户认证 | ✅ 通过 |
| 错题管理 | ✅ 通过 |
| 重做管理 | ✅ 通过 |
| 掌握状态 | ✅ 通过 |
| 报告系统 | ✅ 通过 |
| LLM服务 | ✅ 通过 |
| 变更流程 | ✅ 通过 |
| 监控告警 | ✅ 通过 |
| 前端页面 | ✅ 通过 |

## 总结

错题管理系统已成功部署并测试通过。所有核心功能模块均已实现，包括：

1. 用户认证和权限管理
2. 错题录入、查询、搜索
3. 学习重做和掌握状态跟踪
4. 报告生成和家长访问
5. LLM智能功能（识别、批改、相似题）
6. 工程自动化（变更流程、监控告警）

系统已准备好投入生产使用。