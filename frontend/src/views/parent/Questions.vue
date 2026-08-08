<template>
  <div class="parent-questions-page">
    <van-nav-bar
      title="孩子错题明细"
      left-arrow
      @click-left="$router.back()"
    />

    <van-tabs
      v-model:active="activeTab"
      sticky
    >
      <van-tab title="全部">
        <van-list v-if="filteredQuestions.length > 0">
          <div
            v-for="question in filteredQuestions"
            :key="question.id"
            class="parent-question-card"
            @click="viewQuestion(question.id)"
          >
            <div class="card-header">
              <span class="card-title" v-html="renderMath(question.title)"></span>
              <van-tag :type="getSubjectType(question.subject)">
                {{ getSubjectText(question.subject) }}
              </van-tag>
            </div>
            
            <div
              v-if="question.content"
              class="card-content-preview"
              v-html="renderMath(question.content)"
            ></div>
            
            <div class="card-footer">
              <span>点击查看详情</span>
              <van-icon name="arrow" />
            </div>
          </div>
        </van-list>
        <van-empty v-else description="暂无错题记录" />
      </van-tab>

      <van-tab title="待复习">
        <van-list v-if="filteredQuestions.length > 0">
          <div
            v-for="question in filteredQuestions"
            :key="question.id"
            class="parent-question-card"
            @click="viewQuestion(question.id)"
          >
            <div class="card-header">
              <span class="card-title" v-html="renderMath(question.title)"></span>
              <van-tag :type="getSubjectType(question.subject)">
                {{ getSubjectText(question.subject) }}
              </van-tag>
            </div>
            
            <div
              v-if="question.content"
              class="card-content-preview"
              v-html="renderMath(question.content)"
            ></div>
            
            <div class="card-footer">
              <span>点击查看详情</span>
              <van-icon name="arrow" />
            </div>
          </div>
        </van-list>
        <van-empty v-else description="暂无待复习题目" />
      </van-tab>

      <van-tab title="已掌握">
        <van-list v-if="filteredQuestions.length > 0">
          <div
            v-for="question in filteredQuestions"
            :key="question.id"
            class="parent-question-card"
            @click="viewQuestion(question.id)"
          >
            <div class="card-header">
              <span class="card-title" v-html="renderMath(question.title)"></span>
              <van-tag :type="getSubjectType(question.subject)">
                {{ getSubjectText(question.subject) }}
              </van-tag>
            </div>
            
            <div
              v-if="question.content"
              class="card-content-preview"
              v-html="renderMath(question.content)"
            ></div>
            
            <div class="card-footer">
              <span>点击查看详情</span>
              <van-icon name="arrow" />
            </div>
          </div>
        </van-list>
        <van-empty v-else description="暂无已掌握题目" />
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { questionService, type Question } from '@/services/questions'
import { renderMath } from '@/utils/math'

const router = useRouter()
const activeTab = ref(0)
const loading = ref(false)
const questions = ref<Question[]>([])

const filteredQuestions = computed(() => {
  if (activeTab.value === 0) return questions.value
  if (activeTab.value === 1) {
    return questions.value.filter(q => (q as any).masteryRecords?.[0]?.status !== 'mastered')
  }
  if (activeTab.value === 2) {
    return questions.value.filter(q => (q as any).masteryRecords?.[0]?.status === 'mastered')
  }
  return questions.value
})

const loadQuestions = async () => {
  loading.value = true
  try {
    const data = await questionService.getAll()
    questions.value = data
  } catch (error) {
    console.error('Failed to load questions:', error)
  } finally {
    loading.value = false
  }
}

const viewQuestion = (id: string) => {
  router.push(`/questions/${id}`)
}

const getSubjectType = (subject: string): 'primary' | 'success' | 'warning' | 'default' => {
  const types: Record<string, 'primary' | 'success' | 'warning' | 'default'> = {
    math: 'primary',
    physics: 'success',
    chemistry: 'warning',
  }
  return types[subject] || 'default'
}

const getSubjectText = (subject: string) => {
  const texts: Record<string, string> = {
    math: '数学',
    physics: '物理',
    chemistry: '化学',
  }
  return texts[subject] || subject
}

onMounted(() => {
  loadQuestions()
})
</script>

<style scoped>
.parent-questions-page {
  padding: 12px 16px 80px;
  background-color: #f7f8fa;
  min-height: 100vh;
}

.parent-question-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
}

.card-content-preview {
  font-size: 14px;
  color: #646566;
  line-height: 1.5;
  margin-bottom: 8px;
  max-height: 4.5em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #969799;
  border-top: 1px solid #f2f3f5;
  padding-top: 8px;
}
</style>
