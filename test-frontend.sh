#!/bin/bash

echo "=== 阶段3前端功能测试 ==="
echo ""

# 测试1: 检查前端服务
echo "1. 检查前端服务..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ 前端服务正常运行"
else
    echo "❌ 前端服务异常 (HTTP $FRONTEND_STATUS)"
fi

# 测试2: 检查后端API
echo ""
echo "2. 检查后端API..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ 后端API正常运行"
else
    echo "❌ 后端API异常 (HTTP $BACKEND_STATUS)"
fi

# 测试3: 检查Nginx反向代理
echo ""
echo "3. 检查Nginx反向代理..."
NGINX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80)
if [ "$NGINX_STATUS" = "200" ]; then
    echo "✅ Nginx反向代理正常"
else
    echo "❌ Nginx反向代理异常 (HTTP $NGINX_STATUS)"
fi

# 测试4: 测试用户登录API
echo ""
echo "4. 测试用户登录API..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_student",
    "password": "password123"
  }')
if echo "$LOGIN_RESPONSE" | grep -q '"status":"success"'; then
    echo "✅ 用户登录API正常"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    echo "❌ 用户登录API异常"
    echo "$LOGIN_RESPONSE"
fi

# 测试5: 测试获取错题列表API
echo ""
echo "5. 测试获取错题列表API..."
if [ -n "$TOKEN" ]; then
    QUESTIONS_RESPONSE=$(curl -s http://localhost:3000/api/questions \
      -H "Authorization: Bearer $TOKEN")
    if echo "$QUESTIONS_RESPONSE" | grep -q '"status":"success"'; then
        echo "✅ 获取错题列表API正常"
    else
        echo "❌ 获取错题列表API异常"
        echo "$QUESTIONS_RESPONSE"
    fi
else
    echo "⚠️ 跳过测试（无Token）"
fi

# 测试6: 测试获取掌握状态API
echo ""
echo "6. 测试获取掌握状态API..."
if [ -n "$TOKEN" ]; then
    USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    MASTERY_RESPONSE=$(curl -s "http://localhost:3000/api/mastery/student/$USER_ID/stats" \
      -H "Authorization: Bearer $TOKEN")
    if echo "$MASTERY_RESPONSE" | grep -q '"status":"success"'; then
        echo "✅ 获取掌握状态API正常"
    else
        echo "❌ 获取掌握状态API异常"
        echo "$MASTERY_RESPONSE"
    fi
else
    echo "⚠️ 跳过测试（无Token）"
fi

# 测试7: 测试获取周报API
echo ""
echo "7. 测试获取周报API..."
if [ -n "$TOKEN" ]; then
    WEEKLY_RESPONSE=$(curl -s http://localhost:3000/api/reports/weekly \
      -H "Authorization: Bearer $TOKEN")
    if echo "$WEEKLY_RESPONSE" | grep -q '"status":"success"'; then
        echo "✅ 获取周报API正常"
    else
        echo "❌ 获取周报API异常"
        echo "$WEEKLY_RESPONSE"
    fi
else
    echo "⚠️ 跳过测试（无Token）"
fi

# 测试8: 检查前端静态资源
echo ""
echo "8. 检查前端静态资源..."
CSS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/assets/index-CubVCSz6.css)
JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/assets/index-D0Wllwe-.js)
if [ "$CSS_STATUS" = "200" ] && [ "$JS_STATUS" = "200" ]; then
    echo "✅ 前端静态资源正常"
else
    echo "❌ 前端静态资源异常 (CSS: $CSS_STATUS, JS: $JS_STATUS)"
fi

# 测试9: 检查页面路由
echo ""
echo "9. 检查页面路由..."
ROUTES=("/" "/login" "/register" "/student" "/parent" "/admin")
for route in "${ROUTES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001$route")
    if [ "$STATUS" = "200" ]; then
        echo "  ✅ $route - 正常"
    else
        echo "  ❌ $route - 异常 (HTTP $STATUS)"
    fi
done

# 测试10: 检查容器状态
echo ""
echo "10. 检查容器状态..."
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== 测试完成 ==="