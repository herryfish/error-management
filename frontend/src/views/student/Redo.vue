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
          :label="`${question.subject} · 难度${question.difficulty}`"
        >
          <template #title>
            <div class="question-title-rendered" v-html="renderMath(question.title)"></div>
          </template>
        </van-cell>

        <van-cell title="题目">
          <div class="question-content" v-html="renderMath(question.content)"></div>
        </van-cell>
      </van-cell-group>
      
      <van-form @submit="onSubmit" style="margin-top: 16px;">
        <van-cell-group inset title="你的解答">
          <van-field
            v-model="userAnswer"
            type="textarea"
            rows="4"
            placeholder="请输入你的作答内容..."
            :rules="[{ required: true, message: '请填写作答内容' }]"
          />
        </van-cell-group>
        
        <div style="margin: 16px;">
          <van-button round block type="primary" native-type="submit" :loading="submitting">
            提交解答
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
}

.question-title-rendered {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

.question-content {
  font-size: 15px;
  color: #323233;
  line-height: 1.6;
}
</style>
