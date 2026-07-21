<template>
  <div class="questions-page">
    <van-nav-bar title="错题本" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon name="search" @click="showSearch = true" />
      </template>
    </van-nav-bar>
    
    <van-tabs v-model:active="activeTab" sticky>
      <van-tab title="全部">
        <van-list v-model:loading="loading" :finished="finished" @load="loadQuestions">
          <van-cell v-for="question in questions" :key="question.id" :title="question.title" :label="question.subject" is-link @click="viewQuestion(question.id)">
            <template #right-icon>
              <van-tag :type="getSubjectType(question.subject)">{{ getSubjectText(question.subject) }}</van-tag>
            </template>
          </van-cell>
        </van-list>
      </van-tab>
      <van-tab title="待复习">
        <van-empty description="暂无待复习题目" />
      </van-tab>
      <van-tab title="已掌握">
        <van-empty description="暂无已掌握题目" />
      </van-tab>
    </van-tabs>
    
    <van-button type="primary" block round class="add-button" @click="$router.push('/questions/add')">
      <van-icon name="plus" /> 录入新错题
    </van-button>
    
    <van-popup v-model:show="showSearch" position="right" :style="{ width: '80%', height: '100%' }">
      <div class="search-panel">
        <van-nav-bar title="搜索" left-text="取消" @click-left="showSearch = false" />
        <van-search v-model="searchKeyword" placeholder="搜索题目" show-action @search="onSearch">
          <template #action>
            <div @click="onSearch">搜索</div>
          </template>
        </van-search>
        <van-cell-group>
          <van-cell title="科目" is-link @click="showSubjectPicker = true" :value="searchSubject || '全部'" />
          <van-cell title="难度" is-link @click="showDifficultyPicker = true" :value="searchDifficulty || '全部'" />
        </van-cell-group>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { questionService, type Question } from '@/services/questions'

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
  // TODO: Implement search
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

onMounted(() => {
  loadQuestions()
})
</script>

<style scoped>
.questions-page {
  padding-bottom: 80px;
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