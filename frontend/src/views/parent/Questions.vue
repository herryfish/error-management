<template>
  <div class="parent-questions-page">
    <van-nav-bar title="孩子错题" left-arrow @click-left="$router.back()" />
    
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
  padding-bottom: 80px;
}
</style>