# 错题管理系统 · 数据库设计文档 v1.0

| 项 | 内容 |
|----|------|
| **版本** | v1.0 |
| **日期** | 2026-07-21 |
| **基于** | 需求确认书 v1.3 完整版、系统架构文档 v1.0 |
| **数据库** | MariaDB 10.11 |
| **ORM** | TypeORM (Migrations) |

---

## 1. ER 图

```
┌──────────────┐       1:1       ┌──────────────┐
│   students   │◄───────────────►│   parents    │
│              │                 │              │
│ id (PK)      │                 │ id (PK)      │
│ username     │                 │ student_id(FK)│
│ password_hash│                 │ username     │
│ role         │                 │ password_hash│
│ created_at   │                 │ created_at   │
└──────┬───────┘                 └──────────────┘
       │
       │ 1:N
       ▼
┌──────────────┐       N:1       ┌──────────────────┐
│  questions   │◄───────────────►│ knowledge_points  │
│              │                 │                  │
│ id (PK)      │                 │ id (PK)          │
│ student_id(FK)│                │ name             │
│ subject      │                 │ subject          │
│ content (JSON)│                │ created_at       │
│ image_path   │                 └──────────────────┘
│ knowledge_id(FK)│                    ▲
│ difficulty   │                       │
│ status       │                 ┌─────┴────────────┐
│ created_at   │                 │question_knowledge │
│ updated_at   │                 │                  │
└──────┬───────┘                 │ question_id (FK) │
       │                         │ knowledge_id(FK) │
       │ 1:N                     └──────────────────┘
       ▼
┌──────────────┐
│ redo_records │
│              │
│ id (PK)      │
│ question_id(FK)│
│ student_id(FK)│
│ type         │  (online/photo)
│ answer       │  (JSON)
│ image_path   │
│ grade_result │  (JSON)
│ is_correct   │
│ used_solution│
│ time_spent   │
│ created_at   │
└──────┬───────┘
       │
       │ 1:1
       ▼
┌──────────────┐
│  mastery     │
│              │
│ id (PK)      │
│ question_id(FK)│ UNIQUE
│ student_id(FK)│
│ state        │
│ streak       │
│ next_review  │
│ last_correct │
│ last_wrong   │
│ updated_at   │
└──────────────┘

┌──────────────┐       N:1       ┌──────────────┐
│ similar_q    │◄───────────────►│  questions   │
│              │                 │              │
│ id (PK)      │                 │ id (PK)      │
│ origin_id(FK)│                 │ ...          │
│ student_id(FK)│                └──────────────┘
│ content (JSON)│
│ status       │  (active/discarded)
│ created_at   │
└──────────────┘

┌──────────────┐
│ llm_usage    │
│              │
│ id (PK)      │
│ student_id(FK)│
│ scene        │
│ provider     │
│ model        │
│ tokens_input │
│ tokens_output│
│ tokens_total │
│ cost         │
│ latency_ms   │
│ success      │
│ error_msg    │
│ related_type │
│ related_id   │
│ request_id   │
│ created_at   │
└──────────────┘

┌──────────────┐
│  audit_log   │
│              │
│ id (PK)      │
│ user_id      │
│ action       │
│ target_type  │
│ target_id    │
│ before_state │
│ after_state  │
│ ip_address   │
│ user_agent   │
│ created_at   │
└──────────────┘

┌──────────────┐
│  sys_config  │
│              │
│ id (PK)      │
│ key          │  UNIQUE
│ value        │
│ description  │
│ updated_by   │
│ updated_at   │
└──────────────┘

┌──────────────┐
│ notifications│
│              │
│ id (PK)      │
│ user_id      │
│ type         │
│ title        │
│ content      │
│ is_read      │
│ related_type │
│ related_id   │
│ created_at   │
└──────────────┘

┌──────────────┐
│weekly_reports│
│              │
│ id (PK)      │
│ student_id(FK)│
│ week_start   │
│ week_end     │
│ content (JSON)│
│ weak_points  │  (JSON)
│ similar_stats│  (JSON)
│ created_at   │
└──────────────┘
```

### 关系汇总

| 关系 | 类型 | 说明 |
|------|------|------|
| students ↔ parents | 1:1 | 一个学生对应一个家长（V1） |
| students → questions | 1:N | 一个学生有多道错题 |
| students → redo_records | 1:N | 一个学生有多条重做记录 |
| questions → redo_records | 1:N | 一道错题可被多次重做 |
| questions → mastery | 1:1 | 一道错题对应一条掌握状态 |
| questions → similar_questions | 1:N | 一道错题可生成多道相似题 |
| questions ↔ knowledge_points | N:N | 一道题可关联多个知识点 |
| students → llm_usage | 1:N | 一个学生有多条 LLM 调用记录 |
| students → weekly_reports | 1:N | 一个学生有多期周报 |

---

## 2. 表结构详细设计

### 2.1 students（学生表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | — | 主键 |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | — | 用户名（登录用） |
| `password_hash` | VARCHAR(255) | NOT NULL | — | bcrypt 哈希后的密码 |
| `nickname` | VARCHAR(50) | | NULL | 显示昵称 |
| `role` | ENUM('student','admin') | NOT NULL | 'student' | 角色（学生/管理员） |
| `status` | ENUM('active','disabled') | NOT NULL | 'active' | 账号状态 |
| `last_login_at` | DATETIME | | NULL | 最后登录时间 |
| `created_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**说明**：V1 阶段一个学生只对应一个家长。`role = 'admin'` 用于管理员视角查看 LLM 用量（可与部署者账号合一）。

---

### 2.2 parents（家长表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | — | 主键 |
| `student_id` | BIGINT UNSIGNED | UNIQUE, NOT NULL, FK→students.id | — | 绑定的学生 ID（1:1） |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | — | 用户名（登录用） |
| `password_hash` | VARCHAR(255) | NOT NULL | — | bcrypt 哈希后的密码 |
| `nickname` | VARCHAR(50) | | NULL | 显示昵称 |
| `status` | ENUM('active','disabled') | NOT NULL | 'active' | 账号状态 |
| `last_login_at` | DATETIME | | NULL | 最后登录时间 |
| `created_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**说明**：`student_id` 设 UNIQUE 保证一个学生只有一个家长。家长角色完全只读，通过 `student_id` 关联查看学生所有数据。

---

### 2.3 questions（错题表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | — | 主键 |
| `student_id` | BIGINT UNSIGNED | NOT NULL, FK→students.id | — | 录入的学生 |
| `subject` | ENUM('math','physics','chemistry') | NOT NULL | — | 科目 |
| `question_type` | VARCHAR(30) | NOT NULL | — | 题型（选择/填空/简答/计算等） |
| `content` | JSON | NOT NULL | — | 题目结构化内容（题干、选项、条件、设问、公式） |
| `answer` | JSON | | NULL | 标准答案（从识别结果中提取） |
| `solution` | TEXT | | NULL | 完整解析（如有） |
| `original_image` | VARCHAR(500) | NOT NULL | — | 原始拍照图片路径 |
| `difficulty` | TINYINT UNSIGNED | | 3 | 难度估计（1-5），可编辑 |
| `status` | ENUM('pending','confirmed','deleted') | NOT NULL | 'pending' | 录入状态：pending=待确认, confirmed=已入库, deleted=已删除 |
| `source` | ENUM('manual','photo') | NOT NULL | 'photo' | 录入方式：manual=手动, photo=拍照 |
| `confirmed_at` | DATETIME | | NULL | 学生确认入库时间 |
| `created_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**`content` JSON 结构示例**：
```json
{
  "stem": "已知函数 f(x) = x² - 2x + 1，求 f(3) 的值",
  "conditions": [],
  "questions": ["求 f(3) 的值"],
  "options": null,
  "formulas": ["f(x) = x² - 2x + 1"]
}
```

**说明**：
- 识别后的结构化文本 + 公式为主，原图永久关联。
- `status = 'pending'` 表示学生拍照后尚未确认，确认后转为 `'confirmed'`，避免脏数据入库。
- 一道题可关联多个知识点，通过中间表 `question_knowledge` 实现 N:N。

---

### 2.4 knowledge_points（知识点表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | — | 主键 |
| `name` | VARCHAR(100) | NOT NULL | — | 知识点名称 |
| `subject` | ENUM('math','physics','chemistry') | NOT NULL | — | 所属科目 |
| `parent_id` | BIGINT UNSIGNED | | NULL | 父知识点 ID（支持层级） |
| `created_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |

**说明**：支持知识点层级（如：数学 → 函数 → 二次函数）。`parent_id = NULL` 表示顶级知识点。

---

### 2.5 question_knowledge（题目-知识点关联表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `question_id` | BIGINT UNSIGNED | PK(联合), FK→questions.id | — | 题目 ID |
| `knowledge_id` | BIGINT UNSIGNED | PK(联合), FK→knowledge_points.id | — | 知识点 ID |

**说明**：一道题可关联多个知识点，一个知识点可被多道题关联。联合主键避免重复关联。

---

### 2.6 redo_records（重做记录表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | — | 主键 |
| `question_id` | BIGINT UNSIGNED | NOT NULL, FK→questions.id | — | 关联的错题 |
| `student_id` | BIGINT UNSIGNED | NOT NULL, FK→students.id | — | 重做的学生 |
| `type` | ENUM('online','photo') | NOT NULL | — | 重做方式：online=在线作答, photo=拍照手写 |
| `answer_content` | JSON | | NULL | 在线作答内容（文本/选项） |
| `answer_image` | VARCHAR(500) | | NULL | 手写拍照图片路径 |
| `grade_result` | JSON | | NULL | 批改结果详情 |
| `grade_raw` | ENUM('correct','partial','wrong') | NOT NULL | — | 批改原始判定 |
| `final_result` | ENUM('correct','partial','wrong') | NOT NULL | — | 最终判定（可能经改判） |
| `is_correct` | TINYINT(1) | NOT NULL | 0 | 是否做对（1=做对, 0=做错/部分对） |
| `used_solution` | TINYINT(1) | NOT NULL | 0 | 是否查看了完整解析 |
| `guidance_mode` | TINYINT(1) | NOT NULL | 0 | 是否进入引导模式 |
| `guidance_chat` | JSON | | NULL | 引导问答对话记录 |
| `time_spent` | INT UNSIGNED | | NULL | 作答耗时（秒） |
| `created_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |

**`grade_result` JSON 结构示例**：
```json
{
  "correct_answer": "f(3) = 4",
  "student_answer": "f(3) = 4",
  "score": 10,
  "max_score": 10,
  "feedback": "完全正确",
  "steps_correct": true
}
```

**`guidance_chat` JSON 结构示例**：
```json
[
  {"role": "system", "content": "你是数学引导助手..."},
  {"role": "assistant", "content": "你能告诉我这道题考的是什么知识点吗？"},
  {"role": "user", "content": "二次函数的求值"},
  {"role": "assistant", "content": "很好！那你能先写出 f(x) 的表达式吗？"}
]
```

**说明**：
- `used_solution = 1` 表示学生查看了完整解析，掌握状态应重置。
- `is_correct` 是简化的对错标记，由 `final_result` 决定（支持改判后更新）。
- 改判操作需同步写入 `audit_log` 表。

---

### 2.7 mastery（掌握状态表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | — | 主键 |
| `question_id` | BIGINT UNSIGNED | UNIQUE, NOT NULL, FK→questions.id | — | 关联的错题（一道题一条记录） |
| `student_id` | BIGINT UNSIGNED | NOT NULL, FK→students.id | — | 学生 ID |
| `state` | ENUM('pending','unmastered','in_progress','consolidating_1','consolidating_2','consolidating_3','mastered','weak') | NOT NULL | 'pending' | 掌握状态 |
| `streak` | TINYINT UNSIGNED | NOT NULL | 0 | 连续做对次数（0-3） |
| `next_review_date` | DATE | | NULL | 下次巩固日期（到期则进入今日任务） |
| `last_correct_at` | DATETIME | | NULL | 最近一次做对时间 |
| `last_wrong_at` | DATETIME | | NULL | 最近一次做错时间 |
| `consecutive_wrong` | TINYINT UNSIGNED | NOT NULL | 0 | 连续做错次数（用于触发相似题） |
| `reset_count` | TINYINT UNSIGNED | NOT NULL | 0 | 被重置次数（看解析导致重置） |
| `created_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**状态机说明**：

| 状态 | 值 | 含义 |
|------|-----|------|
| pending | 0 | 录入待确认 |
| unmastered | 1 | 已入库，未掌握，待重做 |
| in_progress | 2 | 重做中（学生正在作答） |
| consolidating_1 | 3 | 第一次巩固（间隔 1 天） |
| consolidating_2 | 4 | 第二次巩固（间隔 7 天） |
| consolidating_3 | 5 | 第三次巩固（间隔 30 天） |
| mastered | 6 | 已掌握（连续 3 次做对） |
| weak | 7 | 薄弱（反复错/直接看解析） |

**状态转换逻辑**：
- `pending → unmastered`：学生确认入库
- `unmastered → in_progress`：学生开始重做
- `in_progress → consolidating_1`：第一次做对（streak=1）
- `consolidating_1 → consolidating_2`：间隔 1 天后再次做对（streak=2）
- `consolidating_2 → consolidating_3`：间隔 7 天后再次做对（streak=3）
- `consolidating_3 → mastered`：间隔 30 天后再次做对（streak=3, mastered）
- `* → unmastered`：查看完整解析（`used_solution=1`），重置 streak=0
- `* → weak`：连续错 2 次（`consecutive_wrong ≥ 2`）
- `weak → consolidating_1`：引导后独立做对

---

### 2.8 similar_questions（相似题表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | — | 主键 |
| `origin_question_id` | BIGINT UNSIGNED | NOT NULL, FK→questions.id | — | 触发生成的原错题 ID |
| `student_id` | BIGINT UNSIGNED | NOT NULL, FK→students.id | — | 学生 ID |
| `content` | JSON | NOT NULL | — | 相似题内容（结构化） |
| `answer` | JSON | | NULL | 相似题答案 |
| `solution` | TEXT | | NULL | 相似题解析 |
| `status` | ENUM('active','discarded','used') | NOT NULL | 'active' | 状态：active=可用, discarded=已丢弃, used=已使用 |
| `discard_reason` | VARCHAR(200) | | NULL | 丢弃原因（学生标记不适用时） |
| `redo_id` | BIGINT UNSIGNED | | NULL | 关联的重做记录（如已使用） |
| `created_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |

**说明**：
- 连续错 2 次触发生成，由 LLM 生成相似题。
- 学生可标记「不适用」丢弃并重新生成。
- `status = 'discarded'` 后可重新生成新的相似题。

---

### 2.9 llm_usage（LLM 用量表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | — | 主键 |
| `student_id` | BIGINT UNSIGNED | NOT NULL, FK→students.id | — | 发起调用的学生 |
| `scene` | ENUM('question_recognition','handwriting_grading','guidance_chat','solution_generation','similar_generation','other') | NOT NULL | — | 调用场景 |
| `provider` | VARCHAR(50) | NOT NULL | — | LLM 提供商（openai/anthropic/google 等） |
| `model` | VARCHAR(100) | NOT NULL | — | 模型名称（gpt-4o/claude-3 等） |
| `tokens_input` | INT UNSIGNED | | 0 | 输入 token 数 |
| `tokens_output` | INT UNSIGNED | | 0 | 输出 token 数 |
| `tokens_total` | INT UNSIGNED | | 0 | 总 token 数 |
| `cost` | DECIMAL(10,6) | | 0 | 估算费用（USD） |
| `latency_ms` | INT UNSIGNED | | NULL | 响应耗时（毫秒） |
| `success` | TINYINT(1) | NOT NULL | 1 | 是否成功（1=成功, 0=失败） |
| `error_message` | TEXT | | NULL | 失败时的错误信息 |
| `related_type` | VARCHAR(30) | | NULL | 关联业务类型（question/redo/similar） |
| `related_id` | BIGINT UNSIGNED | | NULL | 关联业务 ID |
| `request_id` | VARCHAR(100) | | NULL | 外部 LLM API 请求 ID（用于对账） |
| `request_payload` | JSON | | NULL | 请求摘要（不含敏感信息） |
| `response_summary` | JSON | | NULL | 响应摘要 |
| `created_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 调用时间 |

**说明**：
- 每次 LLM 请求均落库（失败也记一条），用于用量可观测。
- `scene` 枚举覆盖需求中定义的所有调用场景。
- `related_type` + `related_id` 用于关联具体业务实体（可选）。
- `request_id` 存储外部 LLM API 返回的请求 ID，便于对账排查。
- V1 仅记录用量，不做扣费拦截。

---

### 2.10 audit_log（审计日志表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | — | 主键 |
| `user_id` | BIGINT UNSIGNED | NOT NULL | — | 操作用户 ID |
| `user_type` | ENUM('student','parent','admin','system') | NOT NULL | — | 用户类型 |
| `action` | VARCHAR(50) | NOT NULL | — | 操作类型（grade_override/login/config_change 等） |
| `target_type` | VARCHAR(30) | | NULL | 操作目标类型（question/redo/mastery/config） |
| `target_id` | BIGINT UNSIGNED | | NULL | 操作目标 ID |
| `before_state` | JSON | | NULL | 变更前状态 |
| `after_state` | JSON | | NULL | 变更后状态 |
| `ip_address` | VARCHAR(45) | | NULL | 操作者 IP（支持 IPv6） |
| `user_agent` | VARCHAR(500) | | NULL | 操作者 User-Agent |
| `created_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 操作时间 |

**说明**：
- 学生改判必写此表：`action = 'grade_override'`，`before_state`/`after_state` 记录前后批改结果。
- 管理员配置变更也记录（`action = 'config_change'`）。
- `user_agent` 可选，用于排查异常操作。

**审计日志写入场景**：
| 场景 | action | before_state | after_state |
|------|--------|-------------|-------------|
| 学生改判 | `grade_override` | `{"final_result":"wrong"}` | `{"final_result":"correct"}` |
| 登录 | `login` | — | `{"success":true}` |
| 配置变更 | `config_change` | `{"key":"allow_view_solution","value":"true"}` | `{"key":"allow_view_solution","value":"false"}` |

---

### 2.11 sys_config（系统配置表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | — | 主键 |
| `config_key` | VARCHAR(100) | UNIQUE, NOT NULL | — | 配置键 |
| `config_value` | TEXT | NOT NULL | — | 配置值 |
| `config_type` | ENUM('boolean','number','string','json') | NOT NULL | 'string' | 值类型 |
| `description` | VARCHAR(200) | | NULL | 配置说明 |
| `updated_by` | BIGINT UNSIGNED | | NULL | 最近更新者 |
| `created_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**预置配置项**：

| config_key | config_value | config_type | 说明 |
|------------|-------------|-------------|------|
| `allow_view_solution` | `"true"` | boolean | 是否允许「直接看解析」 |
| `consolidation_interval_1` | `"1"` | number | 第一次巩固间隔（天） |
| `consolidation_interval_2` | `"7"` | number | 第二次巩固间隔（天） |
| `consolidation_interval_3` | `"30"` | number | 第三次巩固间隔（天） |
| `mastery_threshold` | `"3"` | number | 掌握所需连续做对次数 |
| `similar_trigger_wrong_count` | `"2"` | number | 触发相似题生成的连续错次数 |
| `daily_target_default` | `"10"` | number | 默认每日目标题量 |
| `llm_fallback_enabled` | `"true"` | boolean | 是否启用 LLM 降级 |
| `llm_primary_provider` | `"openai"` | string | 主 LLM 提供商 |
| `llm_primary_model` | `"gpt-4o"` | string | 主 LLM 模型 |
| `llm_fallback_provider` | `"anthropic"` | string | 备选 LLM 提供商 |
| `llm_fallback_model` | `"claude-3-sonnet"` | string | 备选 LLM 模型 |

---

### 2.12 notifications（站内通知表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | — | 主键 |
| `user_id` | BIGINT UNSIGNED | NOT NULL, FK→students.id/parents.id | — | 接收者 ID |
| `user_type` | ENUM('student','parent') | NOT NULL | — | 接收者类型 |
| `type` | ENUM('weekly_report','similar_ready','system') | NOT NULL | — | 通知类型 |
| `title` | VARCHAR(100) | NOT NULL | — | 通知标题 |
| `content` | TEXT | | NULL | 通知内容 |
| `is_read` | TINYINT(1) | NOT NULL | 0 | 是否已读（用于红点） |
| `related_type` | VARCHAR(30) | | NULL | 关联业务类型 |
| `related_id` | BIGINT UNSIGNED | | NULL | 关联业务 ID |
| `created_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |

**说明**：
- 家长端周报生成后发通知，触发站内红点。
- 相似题生成后通知学生。
- `is_read = 0` 用于前端红点展示。

---

### 2.13 weekly_reports（周报表）

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | — | 主键 |
| `student_id` | BIGINT UNSIGNED | NOT NULL, FK→students.id | — | 学生 ID |
| `week_start` | DATE | NOT NULL | — | 周报起始日期（周一） |
| `week_end` | DATE | NOT NULL | — | 周报结束日期（周日） |
| `total_questions` | INT UNSIGNED | NOT NULL | 0 | 本周新增错题数 |
| `total_redos` | INT UNSIGNED | NOT NULL | 0 | 本周重做次数 |
| `correct_rate` | DECIMAL(5,2) | | 0 | 本周正确率（%） |
| `mastered_count` | INT UNSIGNED | NOT NULL | 0 | 本周新增掌握数 |
| `weak_points` | JSON | | NULL | 薄弱知识点列表 |
| `similar_stats` | JSON | | NULL | 相似题相关统计 |
| `content` | JSON | | NULL | 完整周报内容（用于渲染） |
| `created_at` | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 生成时间 |

**`weak_points` JSON 结构示例**：
```json
[
  {
    "knowledge_id": 1,
    "knowledge_name": "二次函数",
    "wrong_count": 3,
    "mastered": false
  }
]
```

**`similar_stats` JSON 结构示例**：
```json
{
  "total_generated": 5,
  "used": 3,
  "discarded": 2,
  "trigger_questions": ["二次函数求值", "三角函数化简"]
}
```

**说明**：每周一由定时任务自动生成，覆盖上周数据。家长打开 H5 可见周报入口 + 红点。

---

## 3. 字段类型说明

### 3.1 通用字段约定

| 字段模式 | 类型 | 说明 |
|----------|------|------|
| `id` | BIGINT UNSIGNED | 所有表主键统一使用 BIGINT，预留扩展空间 |
| `created_at` | DATETIME | 记录创建时间，自动填充 |
| `updated_at` | DATETIME | 记录更新时间，自动更新 |
| `status` | ENUM | 各表状态字段，使用 ENUM 限定取值范围 |
| `is_*` | TINYINT(1) | 布尔标记字段，1=true, 0=false |

### 3.2 JSON 字段使用规范

| 表 | JSON 字段 | 用途 | 说明 |
|----|-----------|------|------|
| questions | `content` | 题目结构化内容 | 存储题干、选项、公式等 |
| questions | `answer` | 标准答案 | 结构化答案 |
| redo_records | `answer_content` | 在线作答内容 | 文本/选项答案 |
| redo_records | `grade_result` | 批改结果详情 | 评分、反馈、步骤判定 |
| redo_records | `guidance_chat` | 引导对话记录 | 多轮问答历史 |
| similar_questions | `content` | 相似题内容 | LLM 生成的结构化题目 |
| similar_questions | `answer` | 相似题答案 | LLM 生成的答案 |
| llm_usage | `request_payload` | 请求摘要 | 脱敏后的请求内容 |
| llm_usage | `response_summary` | 响应摘要 | 关键响应信息 |
| audit_log | `before_state` | 变更前状态 | 改判前的批改结果 |
| audit_log | `after_state` | 变更后状态 | 改判后的批改结果 |
| weekly_reports | `weak_points` | 薄弱知识点 | 结构化薄弱点列表 |
| weekly_reports | `similar_stats` | 相似题统计 | 生成/使用/丢弃统计 |
| weekly_reports | `content` | 完整周报 | 用于前端渲染的全部内容 |

### 3.3 ENUM 取值汇总

| 表 | 字段 | 取值 |
|----|------|------|
| students | `role` | student, admin |
| students | `status` | active, disabled |
| parents | `status` | active, disabled |
| questions | `subject` | math, physics, chemistry |
| questions | `status` | pending, confirmed, deleted |
| questions | `source` | manual, photo |
| knowledge_points | `subject` | math, physics, chemistry |
| redo_records | `type` | online, photo |
| redo_records | `grade_raw` | correct, partial, wrong |
| redo_records | `final_result` | correct, partial, wrong |
| mastery | `state` | pending, unmastered, in_progress, consolidating_1, consolidating_2, consolidating_3, mastered, weak |
| similar_questions | `status` | active, discarded, used |
| llm_usage | `scene` | question_recognition, handwriting_grading, guidance_chat, solution_generation, similar_generation, other |
| sys_config | `config_type` | boolean, number, string, json |
| notifications | `user_type` | student, parent |
| notifications | `type` | weekly_report, similar_ready, system |
| audit_log | `user_type` | student, parent, admin, system |

---

## 4. 索引设计

### 4.1 索引策略说明

- **主键索引**：所有表的 `id` 字段自动创建主键索引。
- **唯一索引**：`username`、`student_id`（parents 表）等需要唯一性保证的字段。
- **普通索引**：高频查询的外键字段和筛选字段。
- **复合索引**：多字段组合查询场景，注意字段顺序（区分度高的在前）。
- **覆盖索引**：对高频只读查询尽量使用覆盖索引避免回表。

### 4.2 各表索引详细设计

#### students

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `PRIMARY` | `id` | 主键 | — |
| `uk_username` | `username` | UNIQUE | 登录查询 |
| `idx_role` | `role` | 普通 | 管理员筛选 |

#### parents

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `PRIMARY` | `id` | 主键 | — |
| `uk_username` | `username` | UNIQUE | 登录查询 |
| `uk_student_id` | `student_id` | UNIQUE | 1:1 绑定保证 |

#### questions

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `PRIMARY` | `id` | 主键 | — |
| `idx_student_status` | `student_id, status` | 复合 | 按学生查已确认错题（高频） |
| `idx_student_subject` | `student_id, subject` | 复合 | 按学生+科目筛选 |
| `idx_status_created` | `status, created_at` | 复合 | 待确认列表按时间排序 |
| `idx_student_created` | `student_id, created_at` | 复合 | 按时间线浏览错题 |

#### knowledge_points

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `PRIMARY` | `id` | 主键 | — |
| `uk_name_subject` | `name, subject` | UNIQUE | 同科目下知识点名唯一 |
| `idx_parent` | `parent_id` | 普通 | 查子知识点 |
| `idx_subject` | `subject` | 普通 | 按科目筛选 |

#### question_knowledge

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `PRIMARY` | `question_id, knowledge_id` | 联合主键 | — |
| `idx_knowledge` | `knowledge_id` | 普通 | 按知识点反查题目 |

#### redo_records

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `PRIMARY` | `id` | 主键 | — |
| `idx_question` | `question_id` | 普通 | 查某题的重做历史 |
| `idx_student_created` | `student_id, created_at` | 复合 | 按时间线查重做记录 |
| `idx_student_question` | `student_id, question_id` | 复合 | 查某学生某题的重做记录 |

#### mastery

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `PRIMARY` | `id` | 主键 | — |
| `uk_question` | `question_id` | UNIQUE | 一道题一条掌握记录 |
| `idx_student_state` | `student_id, state` | 复合 | 按状态筛选（高频：查未掌握/薄弱题） |
| `idx_next_review` | `student_id, next_review_date` | 复合 | 查今日待巩固题（定时任务高频） |
| `idx_student_streak` | `student_id, streak` | 复合 | 查连续做对进度 |

#### similar_questions

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `PRIMARY` | `id` | 主键 | — |
| `idx_origin` | `origin_question_id` | 普通 | 按原题查相似题 |
| `idx_student_status` | `student_id, status` | 复合 | 按学生查可用相似题 |
| `idx_student_created` | `student_id, created_at` | 复合 | 按时间线查相似题 |

#### llm_usage

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `PRIMARY` | `id` | 主键 | — |
| `idx_student_created` | `student_id, created_at` | 复合 | 按学生+时间查用量 |
| `idx_scene_created` | `scene, created_at` | 复合 | 按场景统计（管理员汇总） |
| `idx_model_created` | `model, created_at` | 复合 | 按模型统计 |
| `idx_created` | `created_at` | 普通 | 时间范围查询 |
| `idx_success` | `success, created_at` | 复合 | 失败记录筛选 |
| `idx_request_id` | `request_id` | 普通 | 按外部请求 ID 对账 |

#### audit_log

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `PRIMARY` | `id` | 主键 | — |
| `idx_user_created` | `user_id, created_at` | 复合 | 按用户查操作历史 |
| `idx_action_created` | `action, created_at` | 复合 | 按操作类型筛选 |
| `idx_target` | `target_type, target_id` | 复合 | 按目标实体查审计记录 |
| `idx_created` | `created_at` | 普通 | 时间范围查询 |

#### sys_config

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `PRIMARY` | `id` | 主键 | — |
| `uk_config_key` | `config_key` | UNIQUE | 配置键唯一 |

#### notifications

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `PRIMARY` | `id` | 主键 | — |
| `idx_user_read` | `user_id, is_read` | 复合 | 查未读通知（红点） |
| `idx_user_type` | `user_id, type` | 复合 | 按类型筛选通知 |
| `idx_user_created` | `user_id, created_at` | 复合 | 按时间线查通知 |

#### weekly_reports

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `PRIMARY` | `id` | 主键 | — |
| `uk_student_week` | `student_id, week_start` | UNIQUE | 一周一期 |
| `idx_student_created` | `student_id, created_at` | 复合 | 按时间线查周报 |

---

## 5. 外键约束

| 表 | 字段 | 参照表 | 参照字段 | ON DELETE | ON UPDATE |
|----|------|--------|----------|-----------|-----------|
| parents | `student_id` | students | id | CASCADE | CASCADE |
| questions | `student_id` | students | id | CASCADE | CASCADE |
| knowledge_points | `parent_id` | knowledge_points | id | SET NULL | CASCADE |
| question_knowledge | `question_id` | questions | id | CASCADE | CASCADE |
| question_knowledge | `knowledge_id` | knowledge_points | id | CASCADE | CASCADE |
| redo_records | `question_id` | questions | id | CASCADE | CASCADE |
| redo_records | `student_id` | students | id | CASCADE | CASCADE |
| mastery | `question_id` | questions | id | CASCADE | CASCADE |
| mastery | `student_id` | students | id | CASCADE | CASCADE |
| similar_questions | `origin_question_id` | questions | id | CASCADE | CASCADE |
| similar_questions | `student_id` | students | id | CASCADE | CASCADE |
| llm_usage | `student_id` | students | id | CASCADE | CASCADE |
| notifications | `user_id` | students/parents | id | CASCADE | CASCADE |
| weekly_reports | `student_id` | students | id | CASCADE | CASCADE |

**说明**：
- 所有关联均使用 `ON DELETE CASCADE`，删除学生时级联清理所有相关数据。
- `knowledge_points.parent_id` 使用 `ON DELETE SET NULL`，删除父知识点时子知识点保留。
- `notifications.user_id` 可关联学生或家长，通过 `user_type` 区分。

---

## 6. 数据库字符集与排序规则

| 项 | 值 |
|----|-----|
| 字符集 | `utf8mb4` |
| 排序规则 | `utf8mb4_unicode_ci` |
| 存储引擎 | InnoDB |

---

## 7. 数据量预估与分区建议（V1）

### 7.1 预估数据量（单学生自用）

| 表 | 日增量 | 月增量 | 年增量 |
|----|--------|--------|--------|
| questions | 3-5 条 | ~120 条 | ~1,500 条 |
| redo_records | 5-10 条 | ~225 条 | ~2,700 条 |
| mastery | 3-5 条（累计） | ~120 条 | ~1,500 条 |
| llm_usage | 10-20 条 | ~450 条 | ~5,400 条 |
| audit_log | 2-5 条 | ~105 条 | ~1,300 条 |
| notifications | 3-5 条 | ~120 条 | ~1,500 条 |
| weekly_reports | — | 4 条 | ~52 条 |

### 7.2 分区建议

V1 自用场景数据量极小，无需分区。若后续上线扩展：
- `llm_usage` 可按 `created_at` 做 RANGE 分区（按月）。
- `audit_log` 可按 `created_at` 做 RANGE 分区（按季度）。
- 历史数据可定期归档到冷存储。

---

## 8. 迁移策略

### 8.1 迁移工具

使用 TypeORM Migrations 管理数据库结构变更：

```bash
# 生成迁移文件
npx typeorm migration:generate -d src/data-source.ts src/migrations/CreateInitialTables

# 运行迁移
npx typeorm migration:run -d src/data-source.ts

# 回滚迁移
npx typeorm migration:revert -d src/data-source.ts
```

### 8.2 迁移审批流程

| 风险等级 | 示例 | 审批要求 |
|----------|------|----------|
| 低风险 | 新增可空字段、新增索引 | AI 审批可通过 |
| 中风险 | 新增表、新增非空字段（有默认值） | AI 初审 + 可选人工 |
| 高风险 | 删除字段、修改字段类型、不可逆数据迁移 | 必须人工审批 |

### 8.3 回滚规范

- 所有迁移文件必须包含 `up()` 和 `down()` 方法。
- 高风险迁移前必须手动备份。
- CI 中集成迁移校验，确保 `down()` 可正确回滚。

---

## 附录 A：建表 SQL 参考

```sql
-- 学生表
CREATE TABLE `students` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `nickname` VARCHAR(50) DEFAULT NULL,
  `role` ENUM('student','admin') NOT NULL DEFAULT 'student',
  `status` ENUM('active','disabled') NOT NULL DEFAULT 'active',
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 家长表
CREATE TABLE `parents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` BIGINT UNSIGNED NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `nickname` VARCHAR(50) DEFAULT NULL,
  `status` ENUM('active','disabled') NOT NULL DEFAULT 'active',
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_student_id` (`student_id`),
  CONSTRAINT `fk_parents_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 错题表
CREATE TABLE `questions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` BIGINT UNSIGNED NOT NULL,
  `subject` ENUM('math','physics','chemistry') NOT NULL,
  `question_type` VARCHAR(30) NOT NULL,
  `content` JSON NOT NULL,
  `answer` JSON DEFAULT NULL,
  `solution` TEXT DEFAULT NULL,
  `original_image` VARCHAR(500) NOT NULL,
  `difficulty` TINYINT UNSIGNED DEFAULT 3,
  `status` ENUM('pending','confirmed','deleted') NOT NULL DEFAULT 'pending',
  `source` ENUM('manual','photo') NOT NULL DEFAULT 'photo',
  `confirmed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_student_status` (`student_id`, `status`),
  KEY `idx_student_subject` (`student_id`, `subject`),
  KEY `idx_status_created` (`status`, `created_at`),
  KEY `idx_student_created` (`student_id`, `created_at`),
  CONSTRAINT `fk_questions_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 知识点表
CREATE TABLE `knowledge_points` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `subject` ENUM('math','physics','chemistry') NOT NULL,
  `parent_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name_subject` (`name`, `subject`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_subject` (`subject`),
  CONSTRAINT `fk_kp_parent` FOREIGN KEY (`parent_id`) REFERENCES `knowledge_points` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 题目-知识点关联表
CREATE TABLE `question_knowledge` (
  `question_id` BIGINT UNSIGNED NOT NULL,
  `knowledge_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`question_id`, `knowledge_id`),
  KEY `idx_knowledge` (`knowledge_id`),
  CONSTRAINT `fk_qk_question` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_qk_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_points` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 重做记录表
CREATE TABLE `redo_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_id` BIGINT UNSIGNED NOT NULL,
  `student_id` BIGINT UNSIGNED NOT NULL,
  `type` ENUM('online','photo') NOT NULL,
  `answer_content` JSON DEFAULT NULL,
  `answer_image` VARCHAR(500) DEFAULT NULL,
  `grade_result` JSON DEFAULT NULL,
  `grade_raw` ENUM('correct','partial','wrong') NOT NULL,
  `final_result` ENUM('correct','partial','wrong') NOT NULL,
  `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
  `used_solution` TINYINT(1) NOT NULL DEFAULT 0,
  `guidance_mode` TINYINT(1) NOT NULL DEFAULT 0,
  `guidance_chat` JSON DEFAULT NULL,
  `time_spent` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_question` (`question_id`),
  KEY `idx_student_created` (`student_id`, `created_at`),
  KEY `idx_student_question` (`student_id`, `question_id`),
  CONSTRAINT `fk_redo_question` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_redo_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 掌握状态表
CREATE TABLE `mastery` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_id` BIGINT UNSIGNED NOT NULL,
  `student_id` BIGINT UNSIGNED NOT NULL,
  `state` ENUM('pending','unmastered','in_progress','consolidating_1','consolidating_2','consolidating_3','mastered','weak') NOT NULL DEFAULT 'pending',
  `streak` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `next_review_date` DATE DEFAULT NULL,
  `last_correct_at` DATETIME DEFAULT NULL,
  `last_wrong_at` DATETIME DEFAULT NULL,
  `consecutive_wrong` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `reset_count` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_question` (`question_id`),
  KEY `idx_student_state` (`student_id`, `state`),
  KEY `idx_next_review` (`student_id`, `next_review_date`),
  KEY `idx_student_streak` (`student_id`, `streak`),
  CONSTRAINT `fk_mastery_question` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mastery_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 相似题表
CREATE TABLE `similar_questions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `origin_question_id` BIGINT UNSIGNED NOT NULL,
  `student_id` BIGINT UNSIGNED NOT NULL,
  `content` JSON NOT NULL,
  `answer` JSON DEFAULT NULL,
  `solution` TEXT DEFAULT NULL,
  `status` ENUM('active','discarded','used') NOT NULL DEFAULT 'active',
  `discard_reason` VARCHAR(200) DEFAULT NULL,
  `redo_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_origin` (`origin_question_id`),
  KEY `idx_student_status` (`student_id`, `status`),
  KEY `idx_student_created` (`student_id`, `created_at`),
  CONSTRAINT `fk_similar_origin` FOREIGN KEY (`origin_question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_similar_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- LLM 用量表
CREATE TABLE `llm_usage` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` BIGINT UNSIGNED NOT NULL,
  `scene` ENUM('question_recognition','handwriting_grading','guidance_chat','solution_generation','similar_generation','other') NOT NULL,
  `provider` VARCHAR(50) NOT NULL,
  `model` VARCHAR(100) NOT NULL,
  `tokens_input` INT UNSIGNED DEFAULT 0,
  `tokens_output` INT UNSIGNED DEFAULT 0,
  `tokens_total` INT UNSIGNED DEFAULT 0,
  `cost` DECIMAL(10,6) DEFAULT 0,
  `latency_ms` INT UNSIGNED DEFAULT NULL,
  `success` TINYINT(1) NOT NULL DEFAULT 1,
  `error_message` TEXT DEFAULT NULL,
  `related_type` VARCHAR(30) DEFAULT NULL,
  `related_id` BIGINT UNSIGNED DEFAULT NULL,
  `request_id` VARCHAR(100) DEFAULT NULL,
  `request_payload` JSON DEFAULT NULL,
  `response_summary` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_student_created` (`student_id`, `created_at`),
  KEY `idx_scene_created` (`scene`, `created_at`),
  KEY `idx_model_created` (`model`, `created_at`),
  KEY `idx_created` (`created_at`),
  KEY `idx_success` (`success`, `created_at`),
  KEY `idx_request_id` (`request_id`),
  CONSTRAINT `fk_llm_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 审计日志表
CREATE TABLE `audit_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `user_type` ENUM('student','parent','admin','system') NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `target_type` VARCHAR(30) DEFAULT NULL,
  `target_id` BIGINT UNSIGNED DEFAULT NULL,
  `before_state` JSON DEFAULT NULL,
  `after_state` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_created` (`user_id`, `created_at`),
  KEY `idx_action_created` (`action`, `created_at`),
  KEY `idx_target` (`target_type`, `target_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统配置表
CREATE TABLE `sys_config` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `config_key` VARCHAR(100) NOT NULL,
  `config_value` TEXT NOT NULL,
  `config_type` ENUM('boolean','number','string','json') NOT NULL DEFAULT 'string',
  `description` VARCHAR(200) DEFAULT NULL,
  `updated_by` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 站内通知表
CREATE TABLE `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `user_type` ENUM('student','parent') NOT NULL,
  `type` ENUM('weekly_report','similar_ready','system') NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `content` TEXT DEFAULT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `related_type` VARCHAR(30) DEFAULT NULL,
  `related_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_read` (`user_id`, `is_read`),
  KEY `idx_user_type` (`user_id`, `type`),
  KEY `idx_user_created` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 周报表
CREATE TABLE `weekly_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` BIGINT UNSIGNED NOT NULL,
  `week_start` DATE NOT NULL,
  `week_end` DATE NOT NULL,
  `total_questions` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_redos` INT UNSIGNED NOT NULL DEFAULT 0,
  `correct_rate` DECIMAL(5,2) DEFAULT 0,
  `mastered_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `weak_points` JSON DEFAULT NULL,
  `similar_stats` JSON DEFAULT NULL,
  `content` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_week` (`student_id`, `week_start`),
  KEY `idx_student_created` (`student_id`, `created_at`),
  CONSTRAINT `fk_report_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

*文档版本: v1.0 | 创建日期: 2026-07-21 | 基于需求确认书 v1.3*
