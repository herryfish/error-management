<template>
  <div class="question-detail">
    <van-nav-bar
      title="题目详情"
      left-arrow
      @click-left="$router.back()"
    />
    
    <div
      v-if="question"
      class="content"
    >
      <van-cell-group inset>
        <van-cell
          :label="`${getSubjectText(question.subject)} · ${getTypeText(question.type)} · 难度${question.difficulty}`"
        >
          <template #title>
            <div class="question-title-rendered" v-html="renderMath(question.title)"></div>
          </template>
        </van-cell>
      </van-cell-group>
      
      <!-- 题目内容卡片：单列垂直上下布局 -->
      <div class="section-card">
        <div class="section-label">题目内容</div>
        <div class="section-body question-content" v-html="renderMath(question.content)"></div>
        <div v-if="question.imageUrl" class="image-wrapper">
          <van-image :src="question.imageUrl" width="100%" fit="contain" radius="8" />
        </div>
      </div>

      <!-- 参考答案卡片：单列垂直上下布局 -->
      <div v-if="question.answer" class="section-card">
        <div class="section-label">参考答案</div>
        <div class="section-body answer-content" v-html="renderMath(question.answer)"></div>
      </div>

      <!-- 解析说明卡片：单列垂直上下布局 -->
      <div v-if="question.explanation" class="section-card">
        <div class="section-label">解析</div>
        <div class="section-body explanation-content" v-html="renderMath(question.explanation)"></div>
      </div>
      
      <van-cell-group
        v-if="question.knowledgePoints?.length"
        inset
        style="margin-top: 16px"
      >
        <van-cell title="知识点">
          <van-tag
            v-for="point in question.knowledgePoints"
            :key="point"
            type="primary"
            style="margin-right: 8px; margin-bottom: 8px;"
          >
            {{ point }}
          </van-tag>
        </van-cell>
      </van-cell-group>

      <!-- 重做记录与掌握状态（家长端/全角色视角） -->
      <van-cell-group
        inset
        style="margin-top: 16px"
        title="学生练习与重做记录"
      >
        <van-cell
          v-if="question.masteryRecords?.length"
          title="掌握进度"
          :value="getMasteryStatusText(question.masteryRecords[0].status)"
        />
        <template v-if="question.redoRecords?.length">
          <van-cell
            v-for="(redo, index) in question.redoRecords"
            :key="redo.id || index"
            :title="`第 ${question.redoRecords.length - index} 次重做`"
            :label="formatDate(redo.createdAt)"
          >
            <template #value>
              <van-tag :type="(redo.isCorrect === true || redo.isCorrect == 1 || redo.isCorrect === '1') ? 'success' : 'danger'">
                {{ (redo.isCorrect === true || redo.isCorrect == 1 || redo.isCorrect === '1') ? '解答正确' : '解答错误' }}
              </van-tag>
            </template>
          </van-cell>
        </template>
        <van-cell v-else title="重做记录" value="暂无重做记录" />
      </van-cell-group>
      
      <!-- 学生端展示操作按钮，家长与管理员端隐藏重做按钮 -->
      <div v-if="isStudent" class="actions">
        <van-button
          type="primary"
          block
          @click="startRedo"
        >
          开始重做
        </van-button>
        <van-button
          type="default"
          block
          @click="viewSimilar"
        >
          查看相似题
        </van-button>
      </div>
    </div>
    
    <van-empty
      v-else
      description="加载中..."
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { questionService, type Question } from '@/services/questions'
import { renderMath } from '@/utils/math'

const route = useRoute()
const router = useRouter()
const question = ref<Question | null>(null)

// 角色判定：是否为学生视角
const userRole = ref(localStorage.getItem('userRole') || 'student')
const isStudent = computed(() => userRole.value === 'student')

const loadQuestion = async () => {
  try {
    const id = route.params.id as string
    question.value = await questionService.getById(id)
  } catch (error) {
    console.error('Failed to load question:', error)
  }
}

const startRedo = () => {
  router.push(`/redo/add/${question.value?.id}`)
}

const viewSimilar = () => {
  router.push(`/similar/${question.value?.id}`)
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

const getMasteryStatusText = (status: string) => {
  const texts: Record<string, string> = {
    new: '新错题',
    learning: '学习中',
    reviewing: '复习中',
    mastered: '已掌握',
  }
  return texts[status] || status
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadQuestion()
})
</script>

<style scoped>
.question-detail {
  padding-bottom: 100px;
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

/* 独立板块卡片：单列上下布局，取消左侧固定宽度的 title */
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

.image-wrapper {
  margin-top: 12px;
}

.actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: white;
  display: flex;
  gap: 12px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  z-index: 99;
}

.actions .van-button {
  flex: 1;
}
</style>
