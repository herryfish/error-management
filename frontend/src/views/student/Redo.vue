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
        <div v-if="question.diagramUrls?.length" class="diagrams-wrapper" style="margin-top: 12px;">
          <div v-for="(url, idx) in question.diagramUrls" :key="idx" class="diagram-item" style="margin-bottom: 8px;">
            <van-image :src="url" width="100%" fit="contain" radius="6" />
          </div>
        </div>
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

      <!-- 阶梯式 3 级提示（检索练习防剧透）：先独立思考，卡壳再逐级解锁 -->
      <van-cell-group
        v-if="!result"
        inset
        title="卡壳了？阶梯提示（先独立思考，逐级解锁）"
        style="margin-top: 16px;"
      >
        <van-cell>
          <template #label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <van-button
                v-for="level in 3"
                :key="`btn-${level}`"
                size="small"
                plain
                type="primary"
                :loading="hintLoadingLevel === level"
                :disabled="!isHintUnlocked(level) || hintLoadingLevel === level"
                @click="requestHint(level as 1 | 2 | 3)"
              >
                {{ GUIDANCE_LEVEL_LABELS[level] }}
              </van-button>
            </div>
          </template>
        </van-cell>
        <van-cell
          v-for="level in [1, 2, 3]"
          :key="`hint-${level}`"
          v-show="hints[level]"
          :title="GUIDANCE_LEVEL_LABELS[level]"
        >
          <template #label>
            <div class="hint-content" v-html="renderMath(hints[level] || '')"></div>
          </template>
        </van-cell>

        <!-- 完整解析兑底：查看后本轮按未独立掌握记录 -->
        <van-cell>
          <template #label>
            <van-button
              size="small"
              plain
              type="danger"
              :disabled="showFullSolution"
              @click="revealFullSolution"
            >
              {{ showFullSolution ? '已查看完整解析' : '看完整解析（本轮记为未独立掌握）' }}
            </van-button>
          </template>
        </van-cell>
        <van-cell-group v-if="showFullSolution" inset style="margin-top: 8px;">
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
          <van-cell title="说明" label="本轮提交将按「未独立掌握」记录：不推进掌握轮次，明天再独立试一次" />
        </van-cell-group>
      </van-cell-group>

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

        <!-- 做错后标注错因（多维度错因体系） -->
        <van-cell-group
          v-if="!(result.isCorrect === true || result.isCorrect == 1 || result.isCorrect === '1')"
          inset
          title="错因标注（帮助生成薄弱点画像）"
          style="margin-top: 12px;"
        >
          <van-cell>
            <template #label>
              <van-checkbox-group v-model="selectedErrorTags" direction="horizontal">
                <van-checkbox
                  v-for="tag in ERROR_TAG_PRESETS"
                  :key="tag"
                  :name="tag"
                  shape="square"
                  style="margin-right: 8px; margin-bottom: 4px;"
                >
                  {{ tag }}
                </van-checkbox>
              </van-checkbox-group>
            </template>
          </van-cell>
          <van-cell>
            <template #value>
              <van-button
                size="small"
                type="primary"
                :loading="savingErrorTags"
                :disabled="selectedErrorTags.length === 0 || errorTagsSaved"
                @click="saveErrorTags"
              >
                {{ errorTagsSaved ? '已记录错因' : '记录错因' }}
              </van-button>
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
import { guidanceService, GUIDANCE_LEVEL_LABELS } from '@/services/guidance'
import { showToast } from 'vant'

const route = useRoute()
const question = ref<Question | null>(null)
const userAnswer = ref('')
const submitting = ref(false)
const result = ref<any | null>(null)

// 阶梯式 3 级提示（检索练习防剧透）：逐级解锁，完整解析为兑底
const hints = ref<Record<number, string>>({})
const hintLoadingLevel = ref<number | null>(null)
const showFullSolution = ref(false)

const isHintUnlocked = (level: number) => {
  // 第 1 级始终可点；第 N 级需先看过第 N-1 级
  return level === 1 || !!hints.value[level - 1]
}

const requestHint = async (level: 1 | 2 | 3) => {
  if (!question.value) return
  hintLoadingLevel.value = level
  try {
    const res = await guidanceService.getHint(question.value.id, level)
    hints.value = { ...hints.value, [level]: res.hint }
  } catch (e: any) {
    showToast(e?.response?.data?.message || e.message || '提示生成失败，请稍后重试')
  } finally {
    hintLoadingLevel.value = null
  }
}

const revealFullSolution = () => {
  showFullSolution.value = true
  showToast('已查看完整解析，本轮将按未独立掌握记录')
}

// 错因标注（做错后可勾选，追加到题目的错因标签）
const ERROR_TAG_PRESETS = ['审题不清', '计算粗心', '公式遗忘', '方法缺失', '其他']
const selectedErrorTags = ref<string[]>([])
const savingErrorTags = ref(false)
const errorTagsSaved = ref(false)

const saveErrorTags = async () => {
  if (!question.value || selectedErrorTags.value.length === 0) return
  savingErrorTags.value = true
  try {
    await questionService.setErrorTags(question.value.id, selectedErrorTags.value, 'merge')
    errorTagsSaved.value = true
    showToast('错因已记录，薄弱点画像将同步更新')
  } catch (e: any) {
    showToast(e.message || '错因记录失败')
  } finally {
    savingErrorTags.value = false
  }
}

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
      assisted: showFullSolution.value,
    })
    result.value = resData
    showToast(showFullSolution.value ? '已提交（本轮按未独立掌握记录）' : '提交成功')
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

.hint-content {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
}

</style>
