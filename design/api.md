# 错题管理系统 · RESTful API 设计文档 v1.0

| 项 | 内容 |
|----|------|
| **版本** | v1.0 |
| **日期** | 2026-07-21 |
| **基于** | 需求确认书 v1.3 + 系统架构文档 v1.0 |
| **状态** | 设计阶段 |

---

## 1. 总览

### 1.1 Base URL

```
https://<domain>/api/v1
```

所有端点均以此为前缀。V1 自用阶段使用 HTTPS，生产环境由 Nginx 终止 SSL。

### 1.2 通用约定

| 项 | 规范 |
|----|------|
| 协议 | HTTPS |
| 数据格式 | JSON (`Content-Type: application/json`) |
| 文件上传 | `multipart/form-data` |
| 时间格式 | ISO 8601 (`2026-07-21T10:30:00Z`) |
| 分页 | `?page=1&per_page=20`（默认 20，最大 100） |
| 排序 | `?sort=created_at&order=desc` |
| ID 格式 | 服务端生成的 `bigint` 自增主键 |
| 版本控制 | URL 路径 (`/api/v1/...`) |

### 1.3 响应统一结构

**成功响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": { ... }
}
```

**分页响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [ ... ],
    "total": 120,
    "page": 1,
    "per_page": 20
  }
}
```

**错误响应：**

```json
{
  "code": 40001,
  "message": "题目内容不能为空",
  "details": null
}
```

---

## 2. 认证与会话

### 2.1 认证方式

V1 采用 **JWT (JSON Web Token)** 认证：

- **Access Token**：有效期 2 小时，用于 API 请求认证。
- **Refresh Token**：有效期 7 天，用于刷新 Access Token。

**请求头：**

```
Authorization: Bearer <access_token>
```

### 2.2 认证端点

#### POST `/auth/register` — 注册

注册学生账号。家长账号由管理员或学生邀请绑定。

**请求：**

```json
{
  "username": "zhangsan",
  "password": "Abc@1234",
  "role": "student"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | Y | 用户名，3-32 字符，字母数字下划线 |
| password | string | Y | 密码，8-64 字符，至少含字母和数字 |
| role | string | Y | `student`（V1 仅学生自主注册） |

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user_id": 1001,
    "username": "zhangsan",
    "role": "student",
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 7200
  }
}
```

---

#### POST `/auth/login` — 登录

**请求：**

```json
{
  "username": "zhangsan",
  "password": "Abc@1234"
}
```

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user_id": 1001,
    "username": "zhangsan",
    "role": "student",
    "avatar_url": null,
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 7200
  }
}
```

---

#### POST `/auth/refresh` — 刷新 Token

**请求：**

```json
{
  "refresh_token": "eyJ..."
}
```

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "access_token": "eyJ...",
    "expires_in": 7200
  }
}
```

---

#### POST `/auth/logout` — 登出

使当前 Refresh Token 失效。

**请求头：** `Authorization: Bearer <access_token>`

**响应：**

```json
{
  "code": 0,
  "message": "ok"
}
```

---

### 2.3 家长绑定

#### POST `/auth/bind-parent` — 绑定家长

学生发起绑定请求，输入家长账号。

**请求头：** `Authorization: Bearer <student_token>`

**请求：**

```json
{
  "parent_username": "zhangsan_dad"
}
```

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "binding_id": 501,
    "parent_user_id": 2001,
    "parent_username": "zhangsan_dad",
    "status": "pending",
    "created_at": "2026-07-21T10:00:00Z"
  }
}
```

---

#### POST `/auth/bind-parent/confirm` — 家长确认绑定

**请求头：** `Authorization: Bearer <parent_token>`

**请求：**

```json
{
  "binding_id": 501,
  "action": "accept"
}
```

| action | 说明 |
|--------|------|
| accept | 接受绑定 |
| reject | 拒绝绑定 |

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "binding_id": 501,
    "status": "accepted",
    "student_user_id": 1001,
    "student_username": "zhangsan"
  }
}
```

---

## 3. 用户管理

#### GET `/users/me` — 获取当前用户信息

**请求头：** `Authorization: Bearer <token>`

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user_id": 1001,
    "username": "zhangsan",
    "role": "student",
    "avatar_url": null,
    "binding": {
      "binding_id": 501,
      "parent_user_id": 2001,
      "parent_username": "zhangsan_dad",
      "status": "accepted"
    },
    "settings": {
      "daily_target": 5,
      "show_solution_directly": true
    },
    "created_at": "2026-07-20T08:00:00Z"
  }
}
```

---

#### PATCH `/users/me` — 更新当前用户信息

**请求头：** `Authorization: Bearer <token>`

**请求：**

```json
{
  "avatar_url": "https://...",
  "settings": {
    "daily_target": 8
  }
}
```

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user_id": 1001,
    "avatar_url": "https://...",
    "settings": {
      "daily_target": 8,
      "show_solution_directly": true
    }
  }
}
```

---

#### PATCH `/users/me/password` — 修改密码

**请求：**

```json
{
  "old_password": "Abc@1234",
  "new_password": "Xyz@5678"
}
```

**响应：**

```json
{
  "code": 0,
  "message": "ok"
}
```

---

## 4. 错题管理

### 4.1 错题采集

#### POST `/questions/recognize` — 拍照识别错题

上传题目图片，调用 LLM 多模态识别并结构化。

**请求头：** `Authorization: Bearer <student_token>`

**请求：** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | file | Y | 题目图片，支持 JPG/PNG，≤10MB |
| subject | string | N | 科目：`math` / `physics` / `chemistry`（可选，系统也可自动判断） |

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "recognize_id": "rec_abc123",
    "confidence": 0.92,
    "image_url": "/uploads/images/2026/07/21/img_001.jpg",
    "result": {
      "subject": "math",
      "question_type": "calculation",
      "title": "已知函数 f(x) = x³ - 3x² + 2，求 f(x) 在区间 [0,3] 上的最大值和最小值。",
      "conditions": ["f(x) = x³ - 3x² + 2", "区间 [0,3]"],
      "questions": ["求最大值", "求最小值"],
      "knowledge_tags": ["导数", "极值", "闭区间最值"],
      "difficulty": 3
    }
  }
}
```

**低置信度响应（confidence < 0.7）：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "recognize_id": "rec_abc123",
    "confidence": 0.55,
    "image_url": "/uploads/images/2026/07/21/img_001.jpg",
    "result": {
      "subject": "math",
      "question_type": "unknown",
      "title": "识别结果置信度较低，请确认或手动编辑",
      "conditions": [],
      "questions": [],
      "knowledge_tags": [],
      "difficulty": null
    },
    "warnings": ["low_confidence"]
  }
}
```

---

#### POST `/questions` — 确认入库

学生确认识别结果（可编辑），正式入库。

**请求头：** `Authorization: Bearer <student_token>`

**请求：**

```json
{
  "recognize_id": "rec_abc123",
  "subject": "math",
  "question_type": "calculation",
  "title": "已知函数 f(x) = x³ - 3x² + 2，求 f(x) 在区间 [0,3] 上的最大值和最小值。",
  "conditions": ["f(x) = x³ - 3x² + 2", "区间 [0,3]"],
  "questions": ["求最大值", "求最小值"],
  "knowledge_tags": ["导数", "极值", "闭区间最值"],
  "difficulty": 3,
  "student_answer": null,
  "solution": null,
  "source_image_url": "/uploads/images/2026/07/21/img_001.jpg"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| recognize_id | string | Y | 识别任务 ID |
| subject | string | Y | `math` / `physics` / `chemistry` |
| question_type | string | Y | `calculation` / `proof` / `fill_blank` / `choice` / `short_answer` |
| title | string | Y | 题干文本 |
| conditions | string[] | N | 题目条件 |
| questions | string[] | N | 设问列表 |
| knowledge_tags | string[] | N | 知识点标签 |
| difficulty | int | N | 难度 1-5 |
| student_answer | string | N | 学生作答（可后续填写） |
| solution | string | N | 参考解析 |
| source_image_url | string | Y | 原始图片 URL |

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "question_id": 10001,
    "subject": "math",
    "title": "已知函数 f(x) = x³ - 3x² + 2，...",
    "status": "pending",
    "knowledge_tags": ["导数", "极值", "闭区间最值"],
    "difficulty": 3,
    "source_image_url": "/uploads/images/2026/07/21/img_001.jpg",
    "created_at": "2026-07-21T10:30:00Z"
  }
}
```

---

#### PATCH `/questions/:id` — 编辑错题

学生可编辑已入库错题的识别内容。

**请求头：** `Authorization: Bearer <student_token>`

**请求：**（仅传需修改的字段）

```json
{
  "title": "修正后的题干...",
  "knowledge_tags": ["导数", "极值"],
  "difficulty": 4
}
```

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "question_id": 10001,
    "updated_fields": ["title", "knowledge_tags", "difficulty"]
  }
}
```

---

#### DELETE `/questions/:id` — 删除错题

**请求头：** `Authorization: Bearer <student_token>`

**响应：**

```json
{
  "code": 0,
  "message": "ok"
}
```

---

### 4.2 错题查询

#### GET `/questions` — 错题列表

**请求头：** `Authorization: Bearer <token>`

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | N | 页码，默认 1 |
| per_page | int | N | 每页条数，默认 20，最大 100 |
| subject | string | N | 科目筛选 |
| status | string | N | `pending` / `mastered` / `weak` / `all`（默认 all） |
| knowledge_tag | string | N | 知识点标签筛选 |
| sort | string | N | `created_at` / `difficulty` / `last_reviewed_at` |
| order | string | N | `asc` / `desc`（默认 desc） |

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "question_id": 10001,
        "subject": "math",
        "question_type": "calculation",
        "title": "已知函数 f(x) = x³ - 3x² + 2，...",
        "knowledge_tags": ["导数", "极值", "闭区间最值"],
        "difficulty": 3,
        "status": "pending",
        "consecutive_correct": 0,
        "source_image_url": "/uploads/images/2026/07/21/img_001.jpg",
        "created_at": "2026-07-21T10:30:00Z",
        "last_reviewed_at": null
      }
    ],
    "total": 45,
    "page": 1,
    "per_page": 20
  }
}
```

---

#### GET `/questions/:id` — 错题详情

**请求头：** `Authorization: Bearer <token>`

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "question_id": 10001,
    "subject": "math",
    "question_type": "calculation",
    "title": "已知函数 f(x) = x³ - 3x² + 2，求 f(x) 在区间 [0,3] 上的最大值和最小值。",
    "conditions": ["f(x) = x³ - 3x² + 2", "区间 [0,3]"],
    "questions": ["求最大值", "求最小值"],
    "knowledge_tags": ["导数", "极值", "闭区间最值"],
    "difficulty": 3,
    "status": "pending",
    "consecutive_correct": 0,
    "total_reviews": 0,
    "source_image_url": "/uploads/images/2026/07/21/img_001.jpg",
    "solution": null,
    "mastery": {
      "state": "pending",
      "consecutive_correct": 0,
      "next_review_date": null,
      "review_schedule": []
    },
    "reviews": [],
    "created_at": "2026-07-21T10:30:00Z",
    "last_reviewed_at": null
  }
}
```

---

## 5. 重做与批改

### 5.1 在线作答

#### POST `/reviews` — 提交在线作答

**请求头：** `Authorization: Bearer <student_token>`

**请求：**

```json
{
  "question_id": 10001,
  "answer_type": "online",
  "content": "f'(x) = 3x² - 6x = 0 → x=0 or x=2\nf(0)=2, f(2)=-2, f(3)=2\n最大值为2，最小值为-2"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| question_id | int | Y | 错题 ID |
| answer_type | string | Y | `online` / `photo` |
| content | string | Y | 作答内容（文本） |

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "review_id": 20001,
    "question_id": 10001,
    "answer_type": "online",
    "grading": {
      "result": "correct",
      "score": 100,
      "feedback": "解题过程完整，结果正确。",
      "confidence": 0.95
    },
    "mastery_update": {
      "previous_state": "pending",
      "new_state": "first_correct",
      "consecutive_correct": 1,
      "next_review_date": "2026-07-22T00:00:00Z"
    },
    "created_at": "2026-07-21T11:00:00Z"
  }
}
```

---

### 5.2 拍照手写批改

#### POST `/reviews/photo` — 上传手写照片批改

**请求头：** `Authorization: Bearer <student_token>`

**请求：** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| question_id | int | Y | 错题 ID |
| image | file | Y | 手写解题过程照片，≤10MB |

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "review_id": 20002,
    "question_id": 10001,
    "answer_type": "photo",
    "photo_url": "/uploads/reviews/2026/07/21/review_001.jpg",
    "ocr_result": "f'(x) = 3x² - 6x = 0 → x=0 or x=2\nf(0)=2, f(2)=-2, f(3)=2",
    "grading": {
      "result": "correct",
      "score": 100,
      "feedback": "手写过程清晰，求解正确。",
      "confidence": 0.90,
      "process_analysis": "求导正确，解方程正确，极值判断正确"
    },
    "mastery_update": {
      "previous_state": "pending",
      "new_state": "first_correct",
      "consecutive_correct": 1,
      "next_review_date": "2026-07-22T00:00:00Z"
    },
    "created_at": "2026-07-21T11:30:00Z"
  }
}
```

---

### 5.3 改判

#### PATCH `/reviews/:id/grade` — 学生改判

学生可对批改结果进行改判，需记录审计日志。

**请求头：** `Authorization: Bearer <student_token>`

**请求：**

```json
{
  "new_result": "partial",
  "reason": "过程对了但计算有误，少给了一个解"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| new_result | string | Y | `correct` / `partial` / `wrong` |
| reason | string | N | 改判原因 |

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "review_id": 20001,
    "previous_result": "correct",
    "new_result": "partial",
    "mastery_update": {
      "previous_state": "first_correct",
      "new_state": "pending",
      "consecutive_correct": 0
    },
    "audit_log_id": 30001,
    "updated_at": "2026-07-21T12:00:00Z"
  }
}
```

---

### 5.4 重做记录

#### GET `/questions/:id/reviews` — 某题的重做记录

**请求头：** `Authorization: Bearer <token>`

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "review_id": 20001,
        "answer_type": "online",
        "content": "f'(x) = 3x² - 6x = 0...",
        "grading_result": "correct",
        "score": 100,
        "feedback": "解题过程完整，结果正确。",
        "is_override": false,
        "created_at": "2026-07-21T11:00:00Z"
      },
      {
        "review_id": 20002,
        "answer_type": "photo",
        "photo_url": "/uploads/reviews/2026/07/21/review_001.jpg",
        "grading_result": "correct",
        "score": 100,
        "feedback": "手写过程清晰，求解正确。",
        "is_override": false,
        "created_at": "2026-07-21T11:30:00Z"
      }
    ],
    "total": 2
  }
}
```

---

## 6. 引导解答

#### POST `/questions/:id/guide` — 启动引导模式

**请求头：** `Authorization: Bearer <student_token>`

**请求：**

```json
{
  "action": "start"
}
```

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "question_id": 10001,
    "guide_session_id": "guide_xyz789",
    "mode": "guided",
    "first_hint": "这道题需要求函数在闭区间上的最值。你能想到什么方法来找到极值点？",
    "show_solution_allowed": true
  }
}
```

---

#### POST `/questions/:id/guide/chat` — 引导对话（多轮）

**请求头：** `Authorization: Bearer <student_token>`

**请求：**

```json
{
  "guide_session_id": "guide_xyz789",
  "message": "先求导，令导数为零",
  "action": "reply"
}
```

| action | 说明 |
|--------|------|
| reply | 正常回复对话 |
| view_solution | 直接看解析（需 show_solution_allowed = true） |
| give_up | 放弃，标记为不会 |

**响应（reply）：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "guide_session_id": "guide_xyz789",
    "role": "assistant",
    "content": "很好！求导得到 f'(x) = 3x² - 6x。接下来令 f'(x) = 0，你能解出 x 的值吗？",
    "hints_count": 1,
    "show_solution_allowed": true
  }
}
```

**响应（view_solution）：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "guide_session_id": "guide_xyz789",
    "action": "view_solution",
    "solution": "f'(x) = 3x² - 6x = 3x(x-2)\n令 f'(x)=0 得 x=0 或 x=2\nf(0)=2, f(2)=-2, f(3)=2\n最大值为 2，最小值为 -2",
    "mastery_update": {
      "previous_state": "pending",
      "new_state": "pending",
      "consecutive_correct": 0,
      "note": "查看完整解析，重置为未掌握"
    }
  }
}
```

---

## 7. 掌握状态与巩固队列

#### GET `/mastery/dashboard` — 掌握概览

**请求头：** `Authorization: Bearer <token>`

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "total_questions": 45,
    "mastered": 12,
    "in_progress": 20,
    "weak": 8,
    "pending": 5,
    "mastery_rate": 0.267,
    "consecutive_correct_avg": 1.2,
    "by_subject": {
      "math": { "total": 25, "mastered": 8, "rate": 0.32 },
      "physics": { "total": 12, "mastered": 3, "rate": 0.25 },
      "chemistry": { "total": 8, "mastered": 1, "rate": 0.125 }
    },
    "by_knowledge_tag": [
      { "tag": "导数", "total": 8, "mastered": 2, "rate": 0.25 },
      { "tag": "力学", "total": 5, "mastered": 1, "rate": 0.20 }
    ]
  }
}
```

---

#### GET `/mastery/today-task` — 今日学习任务

**请求头：** `Authorization: Bearer <student_token>`

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "daily_target": 5,
    "completed_today": 2,
    "remaining": 3,
    "tasks": [
      {
        "question_id": 10001,
        "type": "new_review",
        "reason": "今日待重做（新错题）",
        "priority": 1,
        "subject": "math",
        "title": "已知函数 f(x) = x³ - 3x² + 2，...",
        "knowledge_tags": ["导数", "极值"],
        "difficulty": 3
      },
      {
        "question_id": 10015,
        "type": "consolidation",
        "reason": "巩固间隔到期（1天）",
        "priority": 2,
        "subject": "physics",
        "title": "一物体从高处自由落下...",
        "knowledge_tags": ["自由落体"],
        "difficulty": 2,
        "next_review_date": "2026-07-21T00:00:00Z",
        "review_count": 1
      },
      {
        "question_id": 10020,
        "type": "weak_review",
        "reason": "薄弱题需强化",
        "priority": 3,
        "subject": "chemistry",
        "title": "计算 NaOH 与 HCl 反应...",
        "knowledge_tags": ["酸碱中和"],
        "difficulty": 2,
        "consecutive_wrong": 2
      }
    ]
  }
}
```

---

#### GET `/mastery/consolidation-queue` — 巩固队列

**请求头：** `Authorization: Bearer <student_token>`

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | N | `due` / `upcoming` / `all`（默认 due） |

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "question_id": 10015,
        "subject": "physics",
        "title": "一物体从高处自由落下...",
        "knowledge_tags": ["自由落体"],
        "status": "due",
        "review_count": 1,
        "next_review_date": "2026-07-21T00:00:00Z",
        "review_schedule": [
          { "interval": "1d", "reviewed_at": "2026-07-20T10:00:00Z", "result": "correct" },
          { "interval": "7d", "reviewed_at": null, "result": null }
        ]
      }
    ],
    "total_due": 3,
    "total_upcoming": 5
  }
}
```

---

## 8. 相似题

#### POST `/similar-generate` — 触发生成相似题

对连续错 2 次的题型/知识点，请求 AI 生成相似题。

**请求头：** `Authorization: Bearer <student_token>`

**请求：**

```json
{
  "question_id": 10001
}
```

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "similar_set_id": "sim_abc456",
    "source_question_id": 10001,
    "trigger_reason": "consecutive_wrong_2",
    "questions": [
      {
        "similar_id": 30001,
        "title": "已知函数 g(x) = x³ - 6x² + 9x + 1，求 g(x) 在区间 [0,4] 上的最值。",
        "knowledge_tags": ["导数", "极值", "闭区间最值"],
        "difficulty": 3,
        "conditions": ["g(x) = x³ - 6x² + 9x + 1", "区间 [0,4]"],
        "questions": ["求最大值", "求最小值"]
      }
    ],
    "generated_at": "2026-07-21T14:00:00Z"
  }
}
```

---

#### POST `/similar-generate/:set_id/regenerate` — 重新生成

学生标记相似题不适用，请求重新生成。

**请求头：** `Authorization: Bearer <student_token>`

**请求：**

```json
{
  "reason": "题目过于简单，没有练习价值"
}
```

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "similar_set_id": "sim_abc456",
    "regenerate_count": 1,
    "questions": [
      {
        "similar_id": 30002,
        "title": "已知函数 h(x) = 2x³ - 9x² + 12x - 3，求 h(x) 的极值。",
        "knowledge_tags": ["导数", "极值"],
        "difficulty": 4
      }
    ],
    "generated_at": "2026-07-21T14:30:00Z"
  }
}
```

---

#### PATCH `/similar/:id/dismiss` — 标记不适用

**请求头：** `Authorization: Bearer <student_token>`

**请求：**

```json
{
  "reason": "超出当前学习范围"
}
```

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "similar_id": 30001,
    "status": "dismissed"
  }
}
```

---

## 9. 报告与提醒

### 9.1 日简报

#### GET `/reports/daily` — 今日学习简报

**请求头：** `Authorization: Bearer <token>`

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "date": "2026-07-21",
    "summary": {
      "questions_reviewed": 5,
      "questions_correct": 3,
      "questions_wrong": 2,
      "accuracy_rate": 0.6,
      "time_spent_minutes": 45
    },
    "mastery_changes": [
      {
        "question_id": 10001,
        "subject": "math",
        "title": "已知函数 f(x) = x³ - 3x² + 2，...",
        "change": "pending → first_correct",
        "detail": "连续做对 1 次"
      }
    ],
    "weak_points": [
      {
        "knowledge_tag": "酸碱中和",
        "consecutive_wrong": 2,
        "related_questions": [10020]
      }
    ],
    "new_similar_generated": 1
  }
}
```

---

### 9.2 周报

#### GET `/reports/weekly` — 上周学习周报

**请求头：** `Authorization: Bearer <token>`

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| week_offset | int | N | 偏移周数，默认 0（上周），-1 表示上上周 |

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "week_start": "2026-07-14",
    "week_end": "2026-07-20",
    "summary": {
      "questions_added": 22,
      "questions_reviewed": 18,
      "mastered_new": 3,
      "accuracy_rate": 0.68,
      "time_spent_minutes": 320,
      "daily_average": {
        "questions_reviewed": 2.6,
        "time_minutes": 45.7
      }
    },
    "weak_points": [
      {
        "knowledge_tag": "导数",
        "total_questions": 8,
        "mastered": 2,
        "accuracy_rate": 0.45,
        "trend": "improving"
      },
      {
        "knowledge_tag": "酸碱中和",
        "total_questions": 5,
        "mastered": 0,
        "accuracy_rate": 0.20,
        "trend": "stable"
      }
    ],
    "similar_questions": {
      "generated": 4,
      "completed": 2,
      "accuracy_rate": 0.50
    },
    "recommendations": [
      "导数薄弱，建议本周增加导数相关练习",
      "酸碱中和连续错 2 次，已生成相似题"
    ]
  }
}
```

---

### 9.3 站内提醒

#### GET `/notifications` — 通知列表

**请求头：** `Authorization: Bearer <token>`

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| unread_only | bool | N | 仅未读，默认 false |

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "notification_id": 40001,
        "type": "weekly_report",
        "title": "上周学习周报已生成",
        "content": "上周共复习 18 道错题，掌握率 68%。",
        "is_read": false,
        "action_url": "/reports/weekly",
        "created_at": "2026-07-21T08:00:00Z"
      },
      {
        "notification_id": 40002,
        "type": "similar_generated",
        "title": "相似题已生成",
        "content": "导数相关题目连续错 2 次，已生成相似题供练习。",
        "is_read": false,
        "action_url": "/similar/sim_abc456",
        "created_at": "2026-07-21T14:00:00Z"
      }
    ],
    "unread_count": 2,
    "total": 15
  }
}
```

---

#### PATCH `/notifications/read` — 标记已读

**请求头：** `Authorization: Bearer <token>`

**请求：**

```json
{
  "notification_ids": [40001, 40002]
}
```

或标记全部已读：

```json
{
  "mark_all": true
}
```

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "updated_count": 2
  }
}
```

---

## 10. 家长端（只读）

### 10.1 学习概览

#### GET `/parent/overview` — 家长查看学生学习概览

**请求头：** `Authorization: Bearer <parent_token>`

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "student": {
      "user_id": 1001,
      "username": "zhangsan"
    },
    "today": {
      "questions_reviewed": 3,
      "accuracy_rate": 0.67,
      "time_spent_minutes": 35,
      "daily_target": 5,
      "completed_rate": 0.60
    },
    "this_week": {
      "questions_added": 18,
      "questions_reviewed": 15,
      "mastered_new": 2,
      "accuracy_rate": 0.65,
      "time_spent_minutes": 280
    },
    "overall": {
      "total_questions": 45,
      "mastered": 12,
      "mastery_rate": 0.267,
      "weak_knowledge_tags": ["导数", "酸碱中和"]
    },
    "notifications_unread": 2
  }
}
```

---

### 10.2 学生错题明细

#### GET `/parent/questions` — 查看学生全部错题

**请求头：** `Authorization: Bearer <parent_token>`

查询参数与学生端 `GET /questions` 相同。

**响应格式与学生端一致，额外字段：**

```json
{
  "question_id": 10001,
  "subject": "math",
  "title": "已知函数 f(x) = x³ - 3x² + 2，...",
  "status": "pending",
  "consecutive_correct": 1,
  "is_viewed_solution": false,
  "is_guide_mode": false,
  "total_reviews": 2,
  "last_review_result": "correct",
  "last_review_at": "2026-07-21T11:00:00Z"
}
```

---

### 10.3 重做明细

#### GET `/parent/questions/:id/reviews` — 查看某题重做记录

**请求头：** `Authorization: Bearer <parent_token>`

**响应格式与学生端一致，家长不可改判。**

---

### 10.4 周报

#### GET `/parent/reports/weekly` — 家长查看周报

**请求头：** `Authorization: Bearer <parent_token>`

响应格式同 `GET /reports/weekly`。

---

## 11. 管理员端（LLM 用量监控）

### 11.1 用量明细

#### GET `/admin/llm-usage` — LLM 调用明细

**请求头：** `Authorization: Bearer <admin_token>`

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | N | 页码 |
| per_page | int | N | 每页条数 |
| scene | string | N | `recognize` / `grading` / `guide` / `solution` / `similar` / `other` |
| model | string | N | 模型名称筛选 |
| date_from | string | N | 起始日期 ISO 8601 |
| date_to | string | N | 结束日期 ISO 8601 |
| status | string | N | `success` / `failed` / `all` |

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "usage_id": 50001,
        "user_id": 1001,
        "username": "zhangsan",
        "scene": "recognize",
        "provider": "openai",
        "model": "gpt-4o",
        "tokens_input": 1520,
        "tokens_output": 680,
        "tokens_total": 2200,
        "estimated_cost": 0.033,
        "latency_ms": 2300,
        "status": "success",
        "related_id": 10001,
        "related_type": "question",
        "created_at": "2026-07-21T10:30:00Z"
      },
      {
        "usage_id": 50002,
        "user_id": 1001,
        "username": "zhangsan",
        "scene": "grading",
        "provider": "openai",
        "model": "gpt-4o",
        "tokens_input": 980,
        "tokens_output": 320,
        "tokens_total": 1300,
        "estimated_cost": 0.018,
        "latms": 1800,
        "status": "success",
        "related_id": 20001,
        "related_type": "review",
        "created_at": "2026-07-21T11:00:00Z"
      }
    ],
    "total": 156,
    "page": 1,
    "per_page": 20
  }
}
```

---

### 11.2 用量汇总

#### GET `/admin/llm-usage/summary` — 用量汇总统计

**请求头：** `Authorization: Bearer <admin_token>`

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| group_by | string | N | `day` / `week` / `month`（默认 day） |
| date_from | string | N | 起始日期 |
| date_to | string | N | 结束日期 |
| scene | string | N | 场景筛选 |

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "group_by": "day",
    "items": [
      {
        "period": "2026-07-21",
        "total_calls": 28,
        "total_tokens_input": 42000,
        "total_tokens_output": 18000,
        "total_tokens": 60000,
        "total_cost": 0.88,
        "failed_calls": 1,
        "failure_rate": 0.036,
        "by_scene": {
          "recognize": { "calls": 8, "tokens": 18000, "cost": 0.26 },
          "grading": { "calls": 12, "tokens": 24000, "cost": 0.35 },
          "guide": { "calls": 5, "tokens": 12000, "cost": 0.18 },
          "similar": { "calls": 3, "tokens": 6000, "cost": 0.09 }
        }
      }
    ],
    "totals": {
      "total_calls": 28,
      "total_tokens": 60000,
      "total_cost": 0.88,
      "failure_rate": 0.036
    }
  }
}
```

---

### 11.3 用户维度汇总

#### GET `/admin/llm-usage/by-user` — 按用户汇总

**请求头：** `Authorization: Bearer <admin_token>`

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "user_id": 1001,
        "username": "zhangsan",
        "total_calls": 28,
        "total_tokens": 60000,
        "total_cost": 0.88,
        "by_scene": {
          "recognize": { "calls": 8, "tokens": 18000, "cost": 0.26 },
          "grading": { "calls": 12, "tokens": 24000, "cost": 0.35 },
          "guide": { "calls": 5, "tokens": 12000, "cost": 0.18 },
          "similar": { "calls": 3, "tokens": 6000, "cost": 0.09 }
        }
      }
    ]
  }
}
```

---

## 12. 系统配置

#### GET `/config` — 获取公开配置

无需认证。返回客户端需要的公开配置项。

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "show_solution_directly": true,
    "max_upload_size_mb": 10,
    "supported_subjects": ["math", "physics", "chemistry"],
    "supported_image_types": ["image/jpeg", "image/png"],
    "consolidation_intervals": ["1d", "7d", "30d"],
    "consecutive_correct_to_mastered": 3,
    "consecutive_wrong_for_similar": 2
  }
}
```

---

#### PATCH `/admin/config` — 管理员更新配置

**请求头：** `Authorization: Bearer <admin_token>`

**请求：**

```json
{
  "show_solution_directly": false,
  "daily_target_default": 5,
  "llm_model_recognize": "gpt-4o",
  "llm_model_grading": "gpt-4o",
  "llm_model_guide": "gpt-4o",
  "llm_model_similar": "gpt-4o"
}
```

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "updated_keys": ["show_solution_directly", "daily_target_default", "llm_model_recognize", "llm_model_grading", "llm_model_guide", "llm_model_similar"]
  }
}
```

---

## 13. 文件上传

#### POST `/upload/image` — 通用图片上传

**请求头：** `Authorization: Bearer <token>`

**请求：** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | Y | 图片文件，≤10MB |
| purpose | string | N | `question` / `review` / `avatar`（默认 question） |

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "file_url": "/uploads/images/2026/07/21/img_002.jpg",
    "file_size": 2048576,
    "content_type": "image/jpeg"
  }
}
```

---

## 14. 错误码定义

### 14.1 通用错误码

| 错误码 | HTTP Status | 说明 |
|--------|-------------|------|
| 0 | 200 | 成功 |
| 40001 | 400 | 请求参数校验失败 |
| 40002 | 400 | 请求体格式错误 |
| 40101 | 401 | 未认证（Token 缺失或无效） |
| 40102 | 401 | Token 已过期 |
| 40103 | 401 | Refresh Token 无效或已过期 |
| 40301 | 403 | 无权限访问该资源 |
| 40302 | 403 | 角色权限不足 |
| 40401 | 404 | 资源不存在 |
| 40901 | 409 | 资源冲突（如重复绑定） |
| 41301 | 413 | 文件过大 |
| 41501 | 415 | 不支持的文件类型 |
| 42901 | 429 | 请求频率超限 |
| 50001 | 500 | 服务器内部错误 |
| 50002 | 500 | 数据库错误 |
| 50201 | 502 | LLM 服务调用失败 |
| 50202 | 502 | LLM 服务超时 |
| 50301 | 503 | LLM 服务降级中，功能暂不可用 |

### 14.2 业务错误码

| 错误码 | HTTP Status | 说明 |
|--------|-------------|------|
| 60001 | 400 | 错题识别失败，建议重拍 |
| 60002 | 400 | 识别置信度过低，请手动编辑确认 |
| 60003 | 400 | 题目已入库，不可重复提交 |
| 60010 | 400 | 重做次数已达上限 |
| 60011 | 400 | 该题已掌握，无需重做 |
| 60020 | 400 | 家长绑定关系已存在 |
| 60021 | 400 | 绑定请求不存在或已处理 |
| 60030 | 400 | 相似题生成失败，请稍后重试 |
| 60031 | 400 | 相似题不适用标记失败 |
| 60040 | 400 | 改判失败，当前状态不允许改判 |
| 60050 | 400 | 配置更新失败 |

---

## 15. 权限矩阵

| 端点 | 学生 | 家长 | 管理员 | 未认证 |
|------|------|------|--------|--------|
| `POST /auth/register` | - | - | - | Y |
| `POST /auth/login` | - | - | - | Y |
| `POST /auth/refresh` | - | - | - | Y |
| `POST /auth/logout` | Y | Y | Y | - |
| `POST /auth/bind-parent` | Y | - | - | - |
| `POST /auth/bind-parent/confirm` | - | Y | - | - |
| `GET /users/me` | Y | Y | Y | - |
| `PATCH /users/me` | Y | - | - | - |
| `PATCH /users/me/password` | Y | Y | Y | - |
| `POST /questions/recognize` | Y | - | - | - |
| `POST /questions` | Y | - | - | - |
| `PATCH /questions/:id` | Y | - | - | - |
| `DELETE /questions/:id` | Y | - | - | - |
| `GET /questions` | Y | Y | Y | - |
| `GET /questions/:id` | Y | Y | Y | - |
| `POST /reviews` | Y | - | - | - |
| `POST /reviews/photo` | Y | - | - | - |
| `PATCH /reviews/:id/grade` | Y | - | - | - |
| `GET /questions/:id/reviews` | Y | Y | Y | - |
| `POST /questions/:id/guide` | Y | - | - | - |
| `POST /questions/:id/guide/chat` | Y | - | - | - |
| `GET /mastery/dashboard` | Y | Y | Y | - |
| `GET /mastery/today-task` | Y | - | - | - |
| `GET /mastery/consolidation-queue` | Y | - | - | - |
| `POST /similar-generate` | Y | - | - | - |
| `POST /similar-generate/:set_id/regenerate` | Y | - | - | - |
| `PATCH /similar/:id/dismiss` | Y | - | - | - |
| `GET /reports/daily` | Y | Y | Y | - |
| `GET /reports/weekly` | Y | Y | Y | - |
| `GET /notifications` | Y | Y | Y | - |
| `PATCH /notifications/read` | Y | Y | Y | - |
| `GET /parent/overview` | - | Y | - | - |
| `GET /parent/questions` | - | Y | - | - |
| `GET /parent/questions/:id/reviews` | - | Y | - | - |
| `GET /parent/reports/weekly` | - | Y | - | - |
| `GET /admin/llm-usage` | - | - | Y | - |
| `GET /admin/llm-usage/summary` | - | - | Y | - |
| `GET /admin/llm-usage/by-user` | - | - | Y | - |
| `GET /config` | - | - | - | Y |
| `PATCH /admin/config` | - | - | Y | - |
| `POST /upload/image` | Y | - | - | - |

---

## 16. 限流策略

| 端点类型 | 限流规则 |
|----------|----------|
| 认证端点 | 10 次/分钟/IP |
| LLM 相关端点 | 30 次/分钟/用户 |
| 文件上传 | 10 次/分钟/用户 |
| 普通查询 | 100 次/分钟/用户 |
| 管理员端 | 60 次/分钟/用户 |

超限时返回 `42901` 错误码，响应头包含：

```
Retry-After: 30
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1690000000
```

---

## 17. LLM 降级处理

当 LLM 服务不可用时，相关端点返回降级响应：

| 场景 | 降级行为 |
|------|----------|
| 错题识别 | 返回 `50301`，提示稍后重试或手动录入 |
| 手写批改 | 返回 `50301`，提示稍后重试 |
| 引导解答 | 降级为展示预设提示，不依赖 LLM |
| 相似题生成 | 返回 `50301`，标记为待生成队列 |
| 完整解析 | 返回 `50301`，展示已有解析（如有） |

降级配置通过 `GET /config` 下发，管理员可通过 `PATCH /admin/config` 切换降级开关。

---

## 18. 版本演进策略

- V1 自用阶段保持单版本 `/api/v1/`。
- 重大变更时增加 `/api/v2/`，旧版本并行维护至废弃。
- 非破坏性变更（新增字段、新增端点）不升级版本号。
- 破坏性变更（字段删除、类型变更）通过新版本号发布。

---

*本文档为错题管理系统 V1 API 设计，基于需求确认书 v1.3 和系统架构文档 v1.0。设计阶段，待确认后作为开发依据。*
