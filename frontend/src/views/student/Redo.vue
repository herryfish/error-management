<template>
  <div class="redo-page">
    <van-nav-bar
      title="在线重做"
      left-arrow
      @click-left="$router.back()"
    />
    
    <div v-if="question" class="content">
      <van-cell-group inset>
        <van-cell
          :label="`${getSubjectText(question.subject)} · ${getTypeText(question.type)} · 难度${question.difficulty}`"
        >
          <template #title>
            <div class="question-title-rendered" v-html="renderMath(question.title)"></div>
          </template>
        </van-cell>

      </van-cell-group>
      
      <!-- 题目内容卡片：对齐题目详情页单列卡片化布局 -->
      <div class="section-card">
        <div class="section-label">题目内容</div>
        <div class="section-body question-content" v-html="renderMath(question.content)"></div>
      </div>
      
      <van-form @submit="onSubmit" style="margin-top: 16px;">
        <van-cell-group inset title="你的解答">
          <van-field
            v-model="userAnswer"
            type="textarea"
            rows="4"
            placeholder="请输入你的作答内容..."
            :disabled="!!result"
            :rules="[{ required: true, message: '请填写作答内容' }]"
          />
        </van-cell-group>
        
        <div style="margin: 16px;">
          <van-button round block type="primary" native-type="submit" :loading="submitting" :disabled="!!result">
            {{ result ? '已提交答案' : '提交解答' }}
          </van-button>
        </div>
      </van-form>

      <!-- 提交反馈结果与解析 -->
      <div v-if="result" class="result-section" style="margin-top: 16px;">
        <van-cell-group inset :title="(result.isCorrect === true || result.isCorrect == 1 || result.isCorrect === '1') ? '✅ 做对了！' : '❌ 做错了'">
          <van-cell title="参考答案">
            <template #label>
              <div v-html="renderMath(question.answer || '暂无答案')"></div>
            </template>
          </van-cell>
          <van-cell title="解析">
            <template #label>
              <div v-html="renderMath(question.explanation || '暂无解析')"></div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { questionService, type Question } from '@/services/questions'
import { renderMath } from '@/utils/math'
import { redoService } from '@/services/redos'
import { showToast } from 'vant'

const route = useRoute()
const question = ref<Question | null>(null)
const userAnswer = ref('')
const submitting = ref(false)
const result = ref<any | null>(null)

const getSubjectText = (subject: string) => {
  const texts: Record<string, string> = {
    math: '数学',
    physics: '物理',
    chemistry: '化学',
  }
  return texts[subject] || subject
}

const getTypeText = (type: string) => {
  const texts: Record<string, string> = {
    choice: '选择题',
    fill: '填空题',
    answer: '解答题',
  }
  return texts[type] || type
}

onMounted(async () => {
  try {
    const questionId = route.params.questionId as string
    question.value = await questionService.getById(questionId)
  } catch (e) {
    console.error(e)
  }
})

const onSubmit = async () => {
  if (!question.value) return
  submitting.value = true
  try {
    const resData = await redoService.create({
      questionId: question.value.id,
      answer: userAnswer.value,
    })
    result.value = resData
    showToast('提交成功')
  } catch (e: any) {
    showToast(e.message || '提交失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.redo-page {
  padding-bottom: 80px;
  background-color: #f7f8fa;
  min-height: 100vh;
}

.content {
  padding: 16px;
}

.question-title-rendered {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  line-height: 1.4;
}

/* 独立板块卡片：单列上下布局，对齐题目详情页样式 */
.section-card {
  margin-top: 16px;
  background: #ffffff;
  border-radius: 8px;
  padding: 14px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 8px;
  border-left: 3px solid var(--van-primary-color, #1989fa);
  padding-left: 8px;
}

.section-body {
  font-size: 15px;
  color: #2c3e50;
  line-height: 1.65;
  word-break: break-word;
  overflow-x: auto;
}

</style>
