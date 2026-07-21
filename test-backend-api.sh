#!/bin/bash

echo "=== 阶段2后端API测试 ==="
echo ""

# 测试1: 健康检查
echo "1. 测试健康检查..."
HEALTH=$(curl -s http://localhost:3000/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "✅ 健康检查通过"
else
    echo "❌ 健康检查失败"
    echo "$HEALTH"
fi

# 测试2: 用户注册 - 学生
echo ""
echo "2. 测试学生注册..."
STUDENT_REGISTER=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_student",
    "password": "password123",
    "role": "student",
    "name": "测试学生",
    "grade": "高三",
    "school": "测试中学"
  }')
if echo "$STUDENT_REGISTER" | grep -q '"status":"success"'; then
    echo "✅ 学生注册成功"
    STUDENT_TOKEN=$(echo "$STUDENT_REGISTER" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    STUDENT_ID=$(echo "$STUDENT_REGISTER" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   Token: ${STUDENT_TOKEN:0:20}..."
else
    echo "⚠️ 学生注册失败（可能已存在），尝试登录..."
fi

# 测试3: 用户注册 - 家长
echo ""
echo "3. 测试家长注册..."
PARENT_REGISTER=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_parent",
    "password": "password123",
    "role": "parent",
    "name": "测试家长",
    "phone": "13800138000",
    "email": "parent@test.com"
  }')
if echo "$PARENT_REGISTER" | grep -q '"status":"success"'; then
    echo "✅ 家长注册成功"
    PARENT_TOKEN=$(echo "$PARENT_REGISTER" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    PARENT_ID=$(echo "$PARENT_REGISTER" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   Token: ${PARENT_TOKEN:0:20}..."
else
    echo "⚠️ 家长注册失败（可能已存在），尝试登录..."
fi

# 测试4: 用户登录
echo ""
echo "4. 测试学生登录..."
STUDENT_LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_student",
    "password": "password123"
  }')
if echo "$STUDENT_LOGIN" | grep -q '"status":"success"'; then
    echo "✅ 学生登录成功"
    STUDENT_TOKEN=$(echo "$STUDENT_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    STUDENT_ID=$(echo "$STUDENT_LOGIN" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   Token: ${STUDENT_TOKEN:0:20}..."
else
    echo "❌ 学生登录失败"
    echo "$STUDENT_LOGIN"
fi

# 测试5: 获取当前用户信息
echo ""
echo "5. 测试获取用户信息..."
ME_RESPONSE=$(curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $STUDENT_TOKEN")
if echo "$ME_RESPONSE" | grep -q '"status":"success"'; then
    echo "✅ 获取用户信息成功"
else
    echo "❌ 获取用户信息失败"
    echo "$ME_RESPONSE"
fi

# 测试6: 创建错题
echo ""
echo "6. 测试创建错题..."
QUESTION_CREATE=$(curl -s -X POST http://localhost:3000/api/questions \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -F 'title=数学题1' \
  -F 'content=求解方程 x^2 + 5x + 6 = 0' \
  -F 'subject=math' \
  -F 'type=answer' \
  -F 'difficulty=2' \
  -F 'knowledgePoints=["方程", "二次方程"]' \
  -F 'answer=x = -2 或 x = -3' \
  -F 'explanation=使用因式分解法：(x+2)(x+3)=0')
if echo "$QUESTION_CREATE" | grep -q '"status":"success"'; then
    echo "✅ 创建错题成功"
    QUESTION_ID=$(echo "$QUESTION_CREATE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
else
    echo "❌ 创建错题失败"
    echo "$QUESTION_CREATE"
fi

# 测试7: 获取错题列表
echo ""
echo "7. 测试获取错题列表..."
QUESTIONS_LIST=$(curl -s http://localhost:3000/api/questions \
  -H "Authorization: Bearer $STUDENT_TOKEN")
if echo "$QUESTIONS_LIST" | grep -q '"status":"success"'; then
    echo "✅ 获取错题列表成功"
else
    echo "❌ 获取错题列表失败"
    echo "$QUESTIONS_LIST"
fi

# 测试8: 创建重做记录
echo ""
echo "8. 测试创建重做记录..."
REDO_CREATE=$(curl -s -X POST http://localhost:3000/api/redos \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"questionId\": \"$QUESTION_ID\",
    \"answer\": \"x = -2 或 x = -3\"
  }")
if echo "$REDO_CREATE" | grep -q '"status":"success"'; then
    echo "✅ 创建重做记录成功"
    REDO_ID=$(echo "$REDO_CREATE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
else
    echo "❌ 创建重做记录失败"
    echo "$REDO_CREATE"
fi

# 测试9: 批改重做记录
echo ""
echo "9. 测试批改重做记录..."
if [ -n "$REDO_ID" ]; then
    GRADE_REDO=$(curl -s -X PUT "http://localhost:3000/api/redos/$REDO_ID/grade" \
      -H "Authorization: Bearer $STUDENT_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "isCorrect": true,
        "feedback": "回答正确"
      }')
    if echo "$GRADE_REDO" | grep -q '"status":"success"'; then
        echo "✅ 批改重做记录成功"
    else
        echo "❌ 批改重做记录失败"
        echo "$GRADE_REDO"
    fi
else
    echo "⚠️ 跳过批改测试（无重做记录ID）"
fi

# 测试10: 获取掌握状态
echo ""
echo "10. 测试获取掌握状态..."
MASTERY_STATS=$(curl -s "http://localhost:3000/api/mastery/student/$STUDENT_ID/stats" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
if echo "$MASTERY_STATS" | grep -q '"status":"success"'; then
    echo "✅ 获取掌握状态成功"
else
    echo "❌ 获取掌握状态失败"
    echo "$MASTERY_STATS"
fi

# 测试11: 获取复习队列
echo ""
echo "11. 测试获取复习队列..."
REVIEW_QUEUE=$(curl -s "http://localhost:3000/api/mastery/student/$STUDENT_ID/queue" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
if echo "$REVIEW_QUEUE" | grep -q '"status":"success"'; then
    echo "✅ 获取复习队列成功"
else
    echo "❌ 获取复习队列失败"
    echo "$REVIEW_QUEUE"
fi

# 测试12: 获取周报
echo ""
echo "12. 测试获取周报..."
WEEKLY_REPORT=$(curl -s http://localhost:3000/api/reports/weekly \
  -H "Authorization: Bearer $STUDENT_TOKEN")
if echo "$WEEKLY_REPORT" | grep -q '"status":"success"'; then
    echo "✅ 获取周报成功"
else
    echo "❌ 获取周报失败"
    echo "$WEEKLY_REPORT"
fi

# 测试13: 获取统计信息
echo ""
echo "13. 测试获取统计信息..."
STATS=$(curl -s http://localhost:3000/api/reports/stats \
  -H "Authorization: Bearer $STUDENT_TOKEN")
if echo "$STATS" | grep -q '"status":"success"'; then
    echo "✅ 获取统计信息成功"
else
    echo "❌ 获取统计信息失败"
    echo "$STATS"
fi

# 测试14: 家长登录
echo ""
echo "14. 测试家长登录..."
PARENT_LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_parent",
    "password": "password123"
  }')
if echo "$PARENT_LOGIN" | grep -q '"status":"success"'; then
    echo "✅ 家长登录成功"
    PARENT_LOGIN_TOKEN=$(echo "$PARENT_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    PARENT_ID=$(echo "$PARENT_LOGIN" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   Token: ${PARENT_LOGIN_TOKEN:0:20}..."
else
    echo "❌ 家长登录失败"
    echo "$PARENT_LOGIN"
fi

# 测试15: 家长获取孩子报告
echo ""
echo "15. 测试家长获取孩子报告..."
if [ -n "$PARENT_LOGIN_TOKEN" ]; then
    CHILD_REPORT=$(curl -s "http://localhost:3000/api/reports/parent/$PARENT_ID/child" \
      -H "Authorization: Bearer $PARENT_LOGIN_TOKEN")
    if echo "$CHILD_REPORT" | grep -q '"status":"success"'; then
        echo "✅ 家长获取孩子报告成功"
    else
        echo "❌ 家长获取孩子报告失败"
        echo "$CHILD_REPORT"
    fi
else
    echo "⚠️ 跳过家长报告测试（无家长Token）"
fi

echo ""
echo "=== 测试完成 ==="