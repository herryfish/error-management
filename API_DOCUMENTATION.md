# 错题管理系统 API 文档

## 概述

错题管理系统提供RESTful API，支持用户认证、错题管理、学习管理、报告生成、LLM智能功能、变更流程和监控告警。

**Base URL**: `http://localhost:3000/api`

**认证方式**: JWT Token（Bearer Token）

## 目录

1. [认证 API](#认证-api)
2. [用户 API](#用户-api)
3. [错题 API](#错题-api)
4. [重做 API](#重做-api)
5. [掌握状态 API](#掌握状态-api)
6. [相似题 API](#相似题-api)
7. [报告 API](#报告-api)
8. [LLM API](#llm-api)
9. [变更流程 API](#变更流程-api)
10. [监控 API](#监控-api)
11. [管理员 API](#管理员-api)

---

## 认证 API

### POST /api/auth/register

用户注册

**请求体**:
```json
{
  "username": "string",
  "password": "string",
  "role": "student|parent|admin",
  "name": "string",
  "grade": "string (可选)",
  "school": "string (可选)",
  "phone": "string (可选)",
  "email": "string (可选)"
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "role": "string"
    },
    "token": "jwt-token"
  }
}
```

### POST /api/auth/login

用户登录

**请求体**:
```json
{
  "username": "string",
  "password": "string"
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "role": "string"
    },
    "token": "jwt-token"
  }
}
```

### POST /api/auth/refresh-token

刷新令牌

**请求体**:
```json
{
  "token": "string"
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "token": "new-jwt-token"
  }
}
```

### POST /api/auth/logout

用户登出

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

### GET /api/auth/me

获取当前用户信息

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "username": "string",
    "role": "string",
    "studentId": "uuid (可选)",
    "parentId": "uuid (可选)"
  }
}
```

### POST /api/auth/bind

绑定学生-家长关系

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "studentId": "uuid"
}
```

**响应**:
```json
{
  "status": "success",
  "message": "Parent and student bound successfully",
  "data": {
    "parentId": "uuid",
    "studentId": "uuid"
  }
}
```

### POST /api/auth/unlink

解绑学生-家长关系

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "message": "Unlinked successfully"
}
```

---

## 用户 API

### GET /api/users

获取用户列表（管理员）

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "username": "string",
      "role": "string",
      "createdAt": "timestamp"
    }
  ]
}
```

### GET /api/users/:id

获取用户详情

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "username": "string",
    "role": "string",
    "studentId": "uuid (可选)",
    "parentId": "uuid (可选)",
    "createdAt": "timestamp"
  }
}
```

### PUT /api/users/:id

更新用户

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "username": "string (可选)",
  "role": "string (可选)"
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "username": "string",
    "role": "string"
  }
}
```

### DELETE /api/users/:id

删除用户（管理员）

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "message": "User deleted successfully"
}
```

---

## 错题 API

### GET /api/questions

获取错题列表

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "content": "string",
      "subject": "math|physics|chemistry",
      "type": "choice|fill|answer",
      "difficulty": 1,
      "knowledgePoints": ["string"],
      "imageUrl": "string",
      "answer": "string",
      "explanation": "string",
      "studentId": "uuid",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
}
```

### GET /api/questions/:id

获取错题详情

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "string",
    "content": "string",
    "subject": "math|physics|chemistry",
    "type": "choice|fill|answer",
    "difficulty": 1,
    "knowledgePoints": ["string"],
    "imageUrl": "string",
    "answer": "string",
    "explanation": "string",
    "studentId": "uuid",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

### POST /api/questions

创建错题

**请求头**:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**请求体**:
```
title: string
content: string
subject: math|physics|chemistry
type: choice|fill|answer
difficulty: number
knowledgePoints: JSON string array
answer: string (可选)
explanation: string (可选)
image: file (可选)
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "string",
    "content": "string",
    "subject": "string",
    "type": "string",
    "difficulty": 1,
    "knowledgePoints": ["string"],
    "imageUrl": "string",
    "studentId": "uuid",
    "createdAt": "timestamp"
  }
}
```

### PUT /api/questions/:id

更新错题

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "title": "string (可选)",
  "content": "string (可选)",
  "subject": "string (可选)",
  "type": "string (可选)",
  "difficulty": 1,
  "knowledgePoints": ["string"],
  "answer": "string (可选)",
  "explanation": "string (可选)"
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "string",
    "content": "string"
  }
}
```

### DELETE /api/questions/:id

删除错题

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "message": "Question deleted successfully"
}
```

### POST /api/questions/identify

AI识别错题

**请求头**:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**请求体**:
```
image: file (必填)
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "question": {
      "id": "uuid",
      "title": "string",
      "content": "string",
      "subject": "string",
      "type": "string",
      "difficulty": 1,
      "knowledgePoints": ["string"],
      "answer": "string",
      "explanation": "string",
      "confidence": 0.85
    },
    "identification": {
      "title": "string",
      "content": "string",
      "subject": "string",
      "type": "string",
      "difficulty": 1,
      "knowledgePoints": ["string"],
      "answer": "string",
      "explanation": "string",
      "confidence": 0.85
    }
  }
}
```

### GET /api/questions/search

搜索错题

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `studentId`: string (可选)
- `subject`: string (可选)
- `type`: string (可选)
- `difficulty`: number (可选)
- `knowledgePoint`: string (可选)
- `keyword`: string (可选)

**响应**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "content": "string",
      "subject": "string"
    }
  ]
}
```

### GET /api/questions/stats/:studentId

获取错题统计

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "total": 10,
    "bySubject": [
      { "subject": "math", "count": 5 },
      { "subject": "physics", "count": 3 },
      { "subject": "chemistry", "count": 2 }
    ],
    "byDifficulty": [
      { "difficulty": 1, "count": 3 },
      { "difficulty": 2, "count": 4 },
      { "difficulty": 3, "count": 3 }
    ]
  }
}
```

---

## 重做 API

### GET /api/redos

获取重做列表

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "type": "online|photo",
      "answer": "string",
      "isCorrect": true,
      "feedback": "string",
      "questionId": "uuid",
      "studentId": "uuid",
      "createdAt": "timestamp"
    }
  ]
}
```

### GET /api/redos/:id

获取重做详情

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "type": "online|photo",
    "answer": "string",
    "isCorrect": true,
    "feedback": "string",
    "questionId": "uuid",
    "studentId": "uuid",
    "createdAt": "timestamp"
  }
}
```

### POST /api/redos

创建在线重做

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "questionId": "uuid",
  "answer": "string"
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "type": "online",
    "answer": "string",
    "isCorrect": false,
    "questionId": "uuid",
    "studentId": "uuid",
    "createdAt": "timestamp"
  }
}
```

### POST /api/redos/photo

创建拍照重做

**请求头**:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**请求体**:
```
questionId: uuid
image: file
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "redo": {
      "id": "uuid",
      "type": "photo",
      "answer": "string",
      "isCorrect": true,
      "questionId": "uuid",
      "studentId": "uuid",
      "createdAt": "timestamp"
    },
    "grading": {
      "isCorrect": true,
      "score": 85,
      "feedback": "回答正确",
      "confidence": 0.9
    }
  }
}
```

### PUT /api/redos/:id/grade

批改重做

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "isCorrect": true,
  "feedback": "string"
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "isCorrect": true,
    "feedback": "string"
  }
}
```

### PUT /api/redos/:id/remark

学生改判

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "isCorrect": true
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "isCorrect": true
  }
}
```

---

## 掌握状态 API

### GET /api/mastery

获取掌握列表

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "status": "new|learning|mastered",
      "correctCount": 0,
      "incorrectCount": 0,
      "intervalLevel": 0,
      "questionId": "uuid",
      "studentId": "uuid",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
}
```

### GET /api/mastery/:id

获取掌握详情

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "status": "new|learning|mastered",
    "correctCount": 0,
    "incorrectCount": 0,
    "intervalLevel": 0,
    "questionId": "uuid",
    "studentId": "uuid",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

### POST /api/mastery

创建掌握记录

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "questionId": "uuid",
  "studentId": "uuid"
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "status": "new",
    "correctCount": 0,
    "incorrectCount": 0,
    "intervalLevel": 0,
    "questionId": "uuid",
    "studentId": "uuid",
    "createdAt": "timestamp"
  }
}
```

### PUT /api/mastery/:id/review

复习掌握记录

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "isCorrect": true
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "status": "learning",
    "correctCount": 1,
    "incorrectCount": 0,
    "intervalLevel": 1,
    "nextReviewDate": "timestamp"
  }
}
```

### GET /api/mastery/student/:studentId/stats

获取掌握统计

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "totalQuestions": 10,
    "masteredQuestions": 3,
    "learningQuestions": 5,
    "newQuestions": 2,
    "masteryRate": 30
  }
}
```

### GET /api/mastery/student/:studentId/queue

获取复习队列

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "status": "learning",
      "nextReviewDate": "timestamp",
      "question": {
        "id": "uuid",
        "title": "string",
        "content": "string"
      }
    }
  ]
}
```

---

## 相似题 API

### GET /api/similar

获取相似题列表

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "content": "string",
      "isApplicable": true,
      "originalQuestionId": "uuid",
      "createdAt": "timestamp"
    }
  ]
}
```

### POST /api/similar

生成相似题

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "questionId": "uuid"
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "content": "string",
    "isApplicable": true,
    "originalQuestionId": "uuid",
    "createdAt": "timestamp"
  }
}
```

### PUT /api/similar/:id/apply

标记相似题为适用

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "isApplicable": true
  }
}
```

### PUT /api/similar/:id/not-apply

标记相似题为不适用

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "reason": "string (可选)"
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "isApplicable": false,
    "reason": "string"
  }
}
```

---

## 报告 API

### GET /api/reports/weekly

获取周报

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "weekStart": "timestamp",
    "weekEnd": "timestamp",
    "weakPoints": ["string"],
    "totalQuestions": 20,
    "masteredQuestions": 5,
    "similarQuestionsGenerated": 3,
    "totalRedos": 15,
    "masteryRate": 25,
    "userId": "uuid",
    "createdAt": "timestamp"
  }
}
```

### GET /api/reports/stats

获取统计信息

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "totalQuestions": 50,
    "totalRedos": 30,
    "correctRedos": 20,
    "accuracyRate": 66.67,
    "masteryStats": {
      "total": 50,
      "mastered": 15,
      "learning": 25,
      "new": 10
    },
    "masteryRate": 30
  }
}
```

### GET /api/reports/student/:studentId/daily

获取日报

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "date": "2024-01-01",
    "questionsAdded": 5,
    "redosCompleted": 3,
    "correctRedos": 2,
    "masteryStats": {
      "total": 50,
      "mastered": 15,
      "learning": 25
    }
  }
}
```

---

## LLM API

### GET /api/llm/usage/summary

### POST /api/questions/identify-multi
大模型多题切分识别接口，支持上传整页图片，自动定位并识别页面中的多道错题。

#### 请求
- Header: `Content-Type: multipart/form-data`
- Body: `file` (Buffer/Stream)

#### 响应
```json
{
  "status": "success",
  "data": [
    { "title": "...", "content": "...", "answer": "...", "bbox": [0,0,100,100] }
  ]
}
```
获取LLM用量汇总

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "totalCalls": 100,
    "successfulCalls": 95,
    "failedCalls": 5,
    "successRate": 95,
    "sceneSummary": [
      { "scene": "recognition", "count": 50, "totalTokens": 10000 },
      { "scene": "grading", "count": 30, "totalTokens": 8000 },
      { "scene": "similar", "count": 20, "totalTokens": 5000 }
    ],
    "modelSummary": [
      { "provider": "openai", "model": "gpt-4-vision", "count": 80 },
      { "provider": "anthropic", "model": "claude-3", "count": 20 }
    ]
  }
}
```

### GET /api/llm/config

获取LLM配置

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "primary": {
      "provider": "openai",
      "model": "gpt-4-vision-preview",
      "apiBase": "https://api.openai.com/v1"
    },
    "fallback": {
      "provider": "anthropic",
      "model": "claude-3-opus-20240229",
      "apiBase": "https://api.anthropic.com"
    },
    "strategy": {
      "enabled": true,
      "retryCount": 2,
      "timeoutMs": 30000
    }
  }
}
```

---

## 变更流程 API

### GET /api/change-requests

获取变更列表

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `status`: string (可选)
- `type`: string (可选)

**响应**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "type": "low|medium|high|urgent",
      "priority": "low|medium|high",
      "status": "pending|approved|rejected|in_progress|completed|deployed",
      "creatorId": "uuid",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
}
```

### POST /api/change-requests

创建变更请求

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "title": "string",
  "description": "string",
  "type": "low|medium|high|urgent",
  "priority": "low|medium|high"
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "type": "string",
    "priority": "string",
    "status": "pending",
    "creatorId": "uuid",
    "createdAt": "timestamp"
  }
}
```

### PUT /api/change-requests/:id/approve

审批变更（管理员）

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "approvalNote": "string (可选)"
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "status": "approved",
    "approvalNote": "string",
    "approvedBy": "uuid",
    "approvedAt": "timestamp"
  }
}
```

### PUT /api/change-requests/:id/reject

拒绝变更（管理员）

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "approvalNote": "string (可选)"
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "status": "rejected",
    "approvalNote": "string",
    "approvedBy": "uuid",
    "approvedAt": "timestamp"
  }
}
```

---

## 监控 API

### GET /api/monitor/health

健康检查（公开）

**响应**:
```json
{
  "status": "success",
  "data": {
    "database": {
      "connected": true
    },
    "memory": {
      "rss": 50000000,
      "heapUsed": 30000000,
      "heapTotal": 50000000
    },
    "uptime": 3600,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /api/monitor

获取监控日志（管理员）

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `level`: string (可选)
- `type`: string (可选)
- `acknowledged`: boolean (可选)

**响应**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "level": "info|warning|error|critical",
      "type": "health_check|deployment|llm_usage|system_error|security",
      "message": "string",
      "details": "string",
      "source": "string",
      "acknowledged": false,
      "createdAt": "timestamp"
    }
  ]
}
```

### GET /api/monitor/stats

获取监控统计（管理员）

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "total": 100,
    "byLevel": [
      { "level": "info", "count": 80 },
      { "level": "warning", "count": 15 },
      { "level": "error", "count": 5 }
    ],
    "byType": [
      { "type": "health_check", "count": 50 },
      { "type": "llm_usage", "count": 30 },
      { "type": "deployment", "count": 20 }
    ],
    "recentErrors": [
      {
        "id": "uuid",
        "message": "string",
        "createdAt": "timestamp"
      }
    ]
  }
}
```

### PUT /api/monitor/:id/acknowledge

确认监控日志（管理员）

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "acknowledged": true,
    "acknowledgedBy": "uuid",
    "acknowledgedAt": "timestamp"
  }
}
```

---

## 管理员 API

### GET /api/admin/stats

获取系统统计

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "users": {
      "total": 10,
      "students": 5,
      "parents": 4,
      "admins": 1
    },
    "questions": {
      "total": 100
    },
    "redos": {
      "total": 50
    },
    "mastery": {
      "total": 100
    },
    "llm": {
      "totalCalls": 200,
      "successfulCalls": 190,
      "failedCalls": 10,
      "successRate": 95
    }
  }
}
```

### GET /api/admin/health

获取系统健康状态

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "database": {
      "connected": true
    },
    "memory": {
      "rss": 50000000,
      "heapUsed": 30000000,
      "heapTotal": 50000000
    },
    "uptime": 3600,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 错误响应

所有API错误响应格式：

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "错误信息"
}
```

常见错误码：
- `400` - 请求参数错误
- `401` - 未认证或令牌无效
- `403` - 无权限
- `404` - 资源不存在
- `500` - 服务器内部错误

---

## 认证说明

所有需要认证的API都需要在请求头中包含JWT Token：

```
Authorization: Bearer <your-jwt-token>
```

Token可以通过登录接口获取，有效期为7天。

---

*API文档版本：v1.0.0*
*最后更新：2024-01-01*
### PUT /api/admin/users/:id/password

管理员重置/修改指定用户的密码。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "password": "new_password_123456"
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "id": "3c9a7ef0-5709-4ba6-82bc-7666f707d40f",
    "username": "test_student"
  }
}
```

### GET /api/llm/usage/by-user

按用户维度统计 LLM Token 用量分布（仅限管理员）。

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": [
    {
      "userId": "3c9a7ef0-5709-4ba6-82bc-7666f707d40f",
      "username": "test_student",
      "role": "student",
      "count": 24,
      "tokensTotal": 77970,
      "tokensInput": 60000,
      "tokensOutput": 17970
    }
  ]
}
```

### GET /api/llm/usage/by-date

按日期维度统计近 7 天 / 近 30 天每日 LLM 调用与 Token 用量（仅限管理员）。

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "status": "success",
  "data": [
    {
      "date": "2026-08-09",
      "count": 5,
      "tokensTotal": 5752
    }
  ]
}
```
