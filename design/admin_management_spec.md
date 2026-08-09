# 管理员控制台功能规格说明书 (Admin Console Functional Spec)

| 项 | 内容 |
|----|------|
| **版本** | v1.0 |
| **日期** | 2026-08-07 |
| **模块** | 管理员控制台 (Admin Console) |
| **状态** | 已确认 / 开发设计 |

---

## 1. 概述

根据需求确认书 v1.3 以及 `design/api.md` 中第 11 及 12 节规定，系统需向管理员提供全套运维与监控功能，包括：
1. **错题统计 (Admin Questions)**：查看系统中全部学生录入的错题列表、详情、按科目/状态筛选与统计。
2. **系统健康 (Admin System Health)**：实时监控数据库连接状态、系统运行时间 (Uptime)、内存消耗及 CPU / 磁盘负载。
3. **系统配置 (Admin System Config)**：查看并在线修改系统全局参数（如 `show_solution_directly`、每套每日目标、最大上传限制等）。
4. **系统状态 (Admin System Dashboard)**：概览面板，整合统计用户、错题、LLM 调用概况及直达导航。
5. **LLM 用量监控 (LLM Usage Monitoring)**：
   - 总体统计（总调用、成功/失败率）
   - **最近调用记录 (Recent Calls)**：展示最近的 LLM 调用明细日志（请求场景、模型、Provider、Token 消耗、耗时、状态、时间）。
   - **按场景统计 (By Scene)**：按 `recognition` (识别)、`grading` (批改)、`guidance` (引导)、`similar` (相似题) 维度统计调用次数、Token 与估算成本。
   - **按模型统计 (By Model)**：按模型及主/降级模型身份维度统计调用量与 Token 消耗。

---

## 2. 页面路由与 UI 规约

| 路由路径 | 对应组件 | 规则描述 |
|:---|:---|:---|
| `/admin` | `AdminDashboard.vue` | 状态卡片展示与主功能入口导航 |
| `/admin/questions` | `AdminQuestions.vue` | 错题列表与统计筛查 |
| `/admin/health` | `AdminHealth.vue` | 系统健康与指标监控 |
| `/admin/config` | `AdminConfig.vue` | 系统参数获取与动态配置修改 |
| `/admin/llm` | `AdminLLMUsage.vue` | LLM 综合使用情况，包含卡片与弹窗（最近调用记录、按场景统计、按模型统计） |

---

## 3. API 端点契约

- `GET /api/admin/questions` — 获取全量错题列表
- `GET /api/admin/health` — 获取系统健康度信息
- `GET /api/admin/config` — 获取系统配置项
- `PUT /api/admin/config` — 保存更新系统配置项
- `GET /api/llm/usage` — 获取最近 LLM 调用记录列表
- `GET /api/llm/usage/summary` — 获取 LLM 调用场景/模型汇总统计数据

---


---

## 4. 2026-08-09 功能扩展 Spec

### 4.1 管理员重置与修改用户密码 Spec
- **端点**：`PUT /api/admin/users/:id/password`
- **权限**：仅限 `admin` 角色访问。
- **请求体**：
  ```json
  { "password": "new_password_string" }
  ```
- **安全与业务逻辑**：
  - 校验密码长度（不少于 6 位）。
  - 使用 `bcryptjs` （salt rounds 10）进行强哈希存储。
  - 重置成功后记录审计日志，防范越权破坏。

### 4.2 LLM 用量多维统计 Spec (按用户 / 按日期)
- **按用户维度统计 API**：`GET /api/llm/usage/by-user`
  - 返回各用户 (username / role) 的 LLM 调用次数、Token 输入/输出与总 Token 消耗透视表。
- **按日期维度统计 API**：`GET /api/llm/usage/by-date`
  - 返回近 7 天 / 近 30 天每日的调用次数与 Token 消耗趋势数据。
