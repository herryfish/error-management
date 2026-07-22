# API文档模板

> 使用此模板为每个API端点创建文档。

## 端点信息

**端点**: `POST /api/auth/login`

**描述**: 用户登录

**标签**: 认证

## 请求

### 请求头

```
Content-Type: application/json
```

### 请求体

```json
{
  "username": "string",
  "password": "string"
}
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

## 响应

### 成功响应 (200)

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "string",
      "username": "string",
      "role": "string"
    },
    "token": "string"
  }
}
```

### 错误响应 (401)

```json
{
  "status": "error",
  "message": "用户名或密码错误"
}
```

## 示例

### cURL

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'
```

### JavaScript

```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'password123',
  }),
})

const data = await response.json()
console.log(data)
```

## 注意事项

1. 密码应该在客户端加密后传输
2. 令牌应该在请求头中携带
3. 令牌有效期为7天

## 相关端点

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/refresh-token` - 刷新令牌
- `POST /api/auth/logout` - 用户登出