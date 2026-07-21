#!/bin/bash

echo "=== 错题管理系统最终测试 ==="
echo ""

# 测试1: 服务健康检查
echo "1. 服务健康检查..."
HEALTH=$(curl -s http://localhost:3000/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "✅ 后端服务正常"
else
    echo "❌ 后端服务异常"
    echo "$HEALTH"
fi

FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ 前端服务正常"
else
    echo "❌ 前端服务异常"
fi

NGINX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80)
if [ "$NGINX_STATUS" = "200" ]; then
    echo "✅ Nginx反向代理正常"
else
    echo "❌ Nginx反向代理异常"
fi

# 测试2: 用户认证
echo ""
echo "2. 用户认证测试..."
STUDENT_REGISTER=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "final_test_student",
    "password": "password123",
    "role": "student",
    "name": "最终测试学生",
    "grade": "高三",
    "school": "测试中学"
  }')
if echo "$STUDENT_REGISTER" | grep -q '"status":"success"'; then
    echo "✅ 学生注册成功"
    STUDENT_TOKEN=$(echo "$STUDENT_REGISTER" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    echo "⚠️ 学生注册失败（可能已存在），尝试登录..."
    STUDENT_LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username": "final_test_student", "password": "password123"}')
    if echo "$STUDENT_LOGIN" | grep -q '"status":"success"'; then
        echo "✅ 学生登录成功"
        STUDENT_TOKEN=$(echo "$STUDENT_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    else
        echo "❌ 学生登录失败"
    fi
fi

# 测试3: 错题管理
echo ""
echo "3. 错题管理测试..."
if [ -n "$STUDENT_TOKEN" ]; then
    QUESTION_CREATE=$(curl -s -X POST http://localhost:3000/api/questions \
      -H "Authorization: Bearer $STUDENT_TOKEN" \
      -F 'title=最终测试题目' \
      -F 'content=求解方程 x^2 + 5x + 6 = 0' \
      -F 'subject=math' \
      -F 'type=answer' \
      -F 'difficulty=2' \
      -F 'knowledgePoints=["方程", "二次方程"]' \
      -F 'answer=x = -2 或 x = -3' \
      -F 'explanation=使用因式分解法')
    if echo "$QUESTION_CREATE" | grep -q '"status":"success"'; then
        echo "✅ 创建错题成功"
        QUESTION_ID=$(echo "$QUESTION_CREATE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    else
        echo "❌ 创建错题失败"
    fi

    QUESTIONS_LIST=$(curl -s http://localhost:3000/api/questions \
      -H "Authorization: Bearer $STUDENT_TOKEN")
    if echo "$QUESTIONS_LIST" | grep -q '"status":"success"'; then
        echo "✅ 获取错题列表成功"
    else
        echo "❌ 获取错题列表失败"
    fi
else
    echo "⚠️ 跳过错题管理测试（无Token）"
fi

# 测试4: 重做管理
echo ""
echo "4. 重做管理测试..."
if [ -n "$STUDENT_TOKEN" ] && [ -n "$QUESTION_ID" ]; then
    REDO_CREATE=$(curl -s -X POST http://localhost:3000/api/redos \
      -H "Authorization: Bearer $STUDENT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"questionId\": \"$QUESTION_ID\", \"answer\": \"x = -2 或 x = -3\"}")
    if echo "$REDO_CREATE" | grep -q '"status":"success"'; then
        echo "✅ 创建重做记录成功"
        REDO_ID=$(echo "$REDO_CREATE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    else
        echo "❌ 创建重做记录失败"
    fi

    if [ -n "$REDO_ID" ]; then
        GRADE_REDO=$(curl -s -X PUT "http://localhost:3000/api/redos/$REDO_ID/grade" \
          -H "Authorization: Bearer $STUDENT_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"isCorrect": true, "feedback": "回答正确"}')
        if echo "$GRADE_REDO" | grep -q '"status":"success"'; then
            echo "✅ 批改重做记录成功"
        else
            echo "❌ 批改重做记录失败"
        fi
    fi
else
    echo "⚠️ 跳过重做管理测试（无Token或题目ID）"
fi

# 测试5: 掌握状态
echo ""
echo "5. 掌握状态测试..."
if [ -n "$STUDENT_TOKEN" ]; then
    USER_ID=$(echo "$STUDENT_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    MASTERY_STATS=$(curl -s "http://localhost:3000/api/mastery/student/$USER_ID/stats" \
      -H "Authorization: Bearer $STUDENT_TOKEN")
    if echo "$MASTERY_STATS" | grep -q '"status":"success"'; then
        echo "✅ 获取掌握状态成功"
    else
        echo "❌ 获取掌握状态失败"
    fi

    REVIEW_QUEUE=$(curl -s "http://localhost:3000/api/mastery/student/$USER_ID/queue" \
      -H "Authorization: Bearer $STUDENT_TOKEN")
    if echo "$REVIEW_QUEUE" | grep -q '"status":"success"'; then
        echo "✅ 获取复习队列成功"
    else
        echo "❌ 获取复习队列失败"
    fi
else
    echo "⚠️ 跳过掌握状态测试（无Token）"
fi

# 测试6: 报告系统
echo ""
echo "6. 报告系统测试..."
if [ -n "$STUDENT_TOKEN" ]; then
    WEEKLY_REPORT=$(curl -s http://localhost:3000/api/reports/weekly \
      -H "Authorization: Bearer $STUDENT_TOKEN")
    if echo "$WEEKLY_REPORT" | grep -q '"status":"success"'; then
        echo "✅ 获取周报成功"
    else
        echo "❌ 获取周报失败"
    fi

    STATS=$(curl -s http://localhost:3000/api/reports/stats \
      -H "Authorization: Bearer $STUDENT_TOKEN")
    if echo "$STATS" | grep -q '"status":"success"'; then
        echo "✅ 获取统计信息成功"
    else
        echo "❌ 获取统计信息失败"
    fi
else
    echo "⚠️ 跳过报告系统测试（无Token）"
fi

# 测试7: LLM服务
echo ""
echo "7. LLM服务测试..."
LLM_USAGE=$(curl -s http://localhost:3000/api/llm/usage/summary \
  -H "Authorization: Bearer $STUDENT_TOKEN")
if echo "$LLM_USAGE" | grep -q '"status":"success"'; then
    echo "✅ 获取LLM用量成功"
else
    echo "❌ 获取LLM用量失败"
fi

# 测试8: 变更流程
echo ""
echo "8. 变更流程测试..."
CHANGE_REQUEST=$(curl -s -X POST http://localhost:3000/api/change-requests \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "测试变更请求", "description": "这是一个测试变更请求", "type": "low", "priority": "medium"}')
if echo "$CHANGE_REQUEST" | grep -q '"status":"success"'; then
    echo "✅ 创建变更请求成功"
else
    echo "❌ 创建变更请求失败"
fi

# 测试9: 监控告警
echo ""
echo "9. 监控告警测试..."
HEALTH_CHECK=$(curl -s http://localhost:3000/api/monitor/health)
if echo "$HEALTH_CHECK" | grep -q '"status":"success"'; then
    echo "✅ 健康检查成功"
else
    echo "❌ 健康检查失败"
fi

# 测试10: 前端页面
echo ""
echo "10. 前端页面测试..."
ROUTES=("/" "/login" "/register" "/student" "/parent" "/admin")
for route in "${ROUTES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001$route")
    if [ "$STATUS" = "200" ]; then
        echo "  ✅ $route - 正常"
    else
        echo "  ❌ $route - 异常 (HTTP $STATUS)"
    fi
done

# 测试11: 容器状态
echo ""
echo "11. 容器状态检查..."
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# 测试12: 数据库状态
echo ""
echo "12. 数据库状态检查..."
TABLES=$(docker compose exec mariadb mysql -u root -ppassword error_management -e "SHOW TABLES;" 2>/dev/null | tail -n +2 | wc -l)
echo "  数据库表数量: $TABLES"

echo ""
echo "=== 最终测试完成 ==="