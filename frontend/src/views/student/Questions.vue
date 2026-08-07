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
        <van-list
          v-model:loading="loading"
          :finished="finished"
          @load="loadQuestions"
        >
          <div
            v-for="question in questions"
            :key="question.id"
            class="question-card"
            @click="viewQuestion(question.id)"
          >
            <div class="question-header">
              <span class="question-title">{{ question.title }}</span>
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
        <van-empty description="暂无待复习题目" />
      </van-tab>
      <van-tab title="已掌握">
        <van-empty description="暂无已掌握题目" />
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
        <van-cell-group>
          <van-cell
            title="科目"
            is-link
            :value="searchSubject || '全部'"
            @click="showSubjectPicker = true"
          />
          <van-cell
            title="难度"
            is-link
            :value="searchDifficulty || '全部'"
            @click="showDifficultyPicker = true"
          />
        </van-cell-group>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { questionService, type Question } from '@/services/questions'
import { renderMath } from '@/utils/math'

const router = useRouter()

const activeTab = ref(0)
const loading = ref(false)
const finished = ref(false)
const questions = ref<Question[]>([])
const showSearch = ref(false)
const searchKeyword = ref('')
const searchSubject = ref('')
const searchDifficulty = ref('')
const showSubjectPicker = ref(false)
const showDifficultyPicker = ref(false)

const loadQuestions = async () => {
  try {
    const data = await questionService.getAll()
    questions.value = data
    finished.value = true
  } catch (error) {
    console.error('Failed to load questions:', error)
  } finally {
    loading.value = false
  }
}

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
  loadQuestions()
})
</script>

<style scoped>
.questions-page {
  padding-bottom: 80px;
  background-color: #f7f8fa;
  min-height: 100vh;
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
