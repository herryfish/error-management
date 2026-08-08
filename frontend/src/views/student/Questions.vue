<template>
  <div class="questions-page">
    <van-nav-bar
      title="错题本"
      left-arrow
      @click-left="$router.back()"
    >
      <template #right>
        <van-icon
          name="search"
          @click="showSearch = true"
        />
      </template>
    </van-nav-bar>
    
    <van-tabs
      v-model:active="activeTab"
      sticky
    >
      <van-tab title="全部">
        <div v-if="filteredQuestions.length === 0" class="empty-wrap">
          <van-empty description="暂无错题记录" />
        </div>
        <van-list v-else>
          <div
            v-for="question in filteredQuestions"
            :key="question.id"
            class="question-card"
            @click="viewQuestion(question.id)"
          >
            <div class="question-header">
              <span class="question-title" v-html="renderMath(question.title)"></span>
              <van-tag :type="getSubjectType(question.subject)">
                {{ getSubjectText(question.subject) }}
              </van-tag>
            </div>
            
            <div
              v-if="question.content"
              class="question-content-preview"
              v-html="renderMath(question.content)"
            ></div>
            
            <div class="question-footer">
              <span class="question-date">{{ formatDate(question.createdAt) }}</span>
              <span class="question-link">查看详情 <van-icon name="arrow" /></span>
            </div>
          </div>
        </van-list>
      </van-tab>

      <van-tab title="待复习">
        <div v-if="pendingReviewQuestions.length === 0" class="empty-wrap">
          <van-empty description="暂无待复习题目" />
        </div>
        <van-list v-else>
          <div
            v-for="question in pendingReviewQuestions"
            :key="question.id"
            class="question-card"
            @click="viewQuestion(question.id)"
          >
            <div class="question-header">
              <span class="question-title" v-html="renderMath(question.title)"></span>
              <van-tag type="warning">待复习</van-tag>
            </div>
            <div
              v-if="question.content"
              class="question-content-preview"
              v-html="renderMath(question.content)"
            ></div>
            <div class="question-footer">
              <span class="question-date">{{ formatDate(question.createdAt) }}</span>
              <span class="question-link">开始重做 <van-icon name="arrow" /></span>
            </div>
          </div>
        </van-list>
      </van-tab>

      <van-tab title="已掌握">
        <div v-if="masteredQuestions.length === 0" class="empty-wrap">
          <van-empty description="暂无已掌握题目" />
        </div>
        <van-list v-else>
          <div
            v-for="question in masteredQuestions"
            :key="question.id"
            class="question-card"
            @click="viewQuestion(question.id)"
          >
            <div class="question-header">
              <span class="question-title" v-html="renderMath(question.title)"></span>
              <van-tag type="success">已掌握</van-tag>
            </div>
            <div
              v-if="question.content"
              class="question-content-preview"
              v-html="renderMath(question.content)"
            ></div>
            <div class="question-footer">
              <span class="question-date">{{ formatDate(question.createdAt) }}</span>
              <span class="question-link">查看详情 <van-icon name="arrow" /></span>
            </div>
          </div>
        </van-list>
      </van-tab>
    </van-tabs>
    
    <van-button
      type="primary"
      block
      round
      class="add-button"
      @click="$router.push('/questions/add')"
    >
      <van-icon name="plus" /> 录入新错题
    </van-button>
    
    <van-popup
      v-model:show="showSearch"
      position="right"
      :style="{ width: '80%', height: '100%' }"
    >
      <div class="search-panel">
        <van-nav-bar
          title="搜索"
          left-text="取消"
          @click-left="showSearch = false"
        />
        <van-search
          v-model="searchKeyword"
          placeholder="搜索题目"
          show-action
          @search="onSearch"
        >
          <template #action>
            <div @click="onSearch">
              搜索
            </div>
          </template>
        </van-search>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { questionService, type Question } from '@/services/questions'
import { masteryService, type Mastery } from '@/services/mastery'
import { renderMath } from '@/utils/math'

const router = useRouter()

const activeTab = ref(0)
const loading = ref(false)
const questions = ref<Question[]>([])
const masteryRecords = ref<Mastery[]>([])
const showSearch = ref(false)
const searchKeyword = ref('')

const loadData = async () => {
  loading.value = true
  try {
    const [qData, mData] = await Promise.all([
      questionService.getAll(),
      masteryService.getAll().catch(() => [])
    ])
    questions.value = qData
    masteryRecords.value = mData
  } catch (error) {
    console.error('Failed to load questions data:', error)
  } finally {
    loading.value = false
  }
}

// 结合 mastery 记录的匹配 Map
const masteryMap = computed(() => {
  const map = new Map<string, Mastery>()
  masteryRecords.value.forEach(m => {
    map.set(m.questionId, m)
  })
  return map
})

// 全部列表 (按搜索词过滤)
const filteredQuestions = computed(() => {
  if (!searchKeyword.value.trim()) return questions.value
  const kw = searchKeyword.value.trim().toLowerCase()
  return questions.value.filter(q => 
    (q.title && q.title.toLowerCase().includes(kw)) ||
    (q.content && q.content.toLowerCase().includes(kw))
  )
})

// 待复习列表 (未掌握且在队列/待复习中)
const pendingReviewQuestions = computed(() => {
  return filteredQuestions.value.filter(q => {
    const m = masteryMap.value.get(q.id)
    if (!m) return true // 若未记录，默认计入待学习复习
    return m.status !== 'mastered'
  })
})

// 已掌握列表 (掌握状态为 mastered)
const masteredQuestions = computed(() => {
  return filteredQuestions.value.filter(q => {
    const m = masteryMap.value.get(q.id)
    return m && m.status === 'mastered'
  })
})

const viewQuestion = (id: string) => {
  router.push(`/questions/${id}`)
}

const onSearch = () => {
  showSearch.value = false
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

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.questions-page {
  padding-bottom: 80px;
  background-color: #f7f8fa;
  min-height: 100vh;
}

.empty-wrap {
  padding: 40px 0;
}

.question-card {
  margin: 12px 16px;
  padding: 14px 16px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.question-card:active {
  transform: scale(0.99);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.question-title {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

.question-content-preview {
  font-size: 14px;
  color: #646566;
  line-height: 1.5;
  margin-bottom: 10px;
  max-height: 4.5em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.question-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #969799;
  border-top: 1px solid #ebedf0;
  padding-top: 8px;
}

.question-link {
  color: var(--van-primary-color, #1989fa);
  display: flex;
  align-items: center;
}

.add-button {
  position: fixed;
  bottom: 20px;
  left: 16px;
  right: 16px;
}

.search-panel {
  padding: 16px;
}
</style>
