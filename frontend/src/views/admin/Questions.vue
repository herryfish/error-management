<template>
  <div class="admin-questions">
    <van-nav-bar
      title="错题统计与管理"
      left-arrow
      @click-left="$router.back()"
    />

    <van-grid :column-num="3" style="margin: 12px 0;">
      <van-grid-item text="总错题数" :badge="stats.total" icon="orders-o" />
      <van-grid-item text="未掌握" :badge="stats.pending" icon="clock-o" />
      <van-grid-item text="已掌握" :badge="stats.mastered" icon="passed" />
    </van-grid>

    <van-dropdown-menu>
      <van-dropdown-item v-model="subjectFilter" :options="subjectOptions" @change="loadQuestions" />
      <van-dropdown-item v-model="statusFilter" :options="statusOptions" @change="loadQuestions" />
    </van-dropdown-menu>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多错题了"
        @load="loadQuestions"
      >
        <van-cell-group inset style="margin-top: 12px;">
          <van-cell
            v-for="item in questions"
            :key="item.id"
            :title="item.title || '无标题错题'"
            :label="`学生: ${item.student?.username || '未知'} | 科目: ${getSubjectText(item.subject)}`"
            :value="getStatusText(item.status)"
            is-link
            @click="viewDetail(item)"
          />
        </van-cell-group>
      </van-list>
    </van-pull-refresh>

    <!-- 错题详情弹窗 -->
    <van-dialog v-model:show="showDetail" :title="selectedQuestion?.title || '错题详情'" close-on-click-overlay>
      <div v-if="selectedQuestion" class="detail-content" style="padding: 16px;">
        <p><strong>学生：</strong>{{ selectedQuestion.student?.username || '未知' }}</p>
        <p><strong>科目：</strong>{{ getSubjectText(selectedQuestion.subject) }}</p>
        <p><strong>状态：</strong>{{ getStatusText(selectedQuestion.status) }}</p>
        <p><strong>难度：</strong>{{ selectedQuestion.difficulty || '未设' }}</p>
        <p><strong>题干内容：</strong></p>
        <div class="box">{{ selectedQuestion.content || selectedQuestion.title }}</div>
        <p v-if="selectedQuestion.answer"><strong>参考答案：</strong></p>
        <div v-if="selectedQuestion.answer" class="box">{{ selectedQuestion.answer }}</div>
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/utils/api'

interface QuestionItem {
  id: string
  title: string
  content?: string
  answer?: string
  subject: string
  status: string
  difficulty?: number
  student?: {
    username: string
  }
}

const questions = ref<QuestionItem[]>([])
const loading = ref(false)
const finished = ref(true)
const refreshing = ref(false)
const showDetail = ref(false)
const selectedQuestion = ref<QuestionItem | null>(null)

const stats = ref({
  total: 0,
  pending: 0,
  mastered: 0,
})

const subjectFilter = ref('all')
const statusFilter = ref('all')

const subjectOptions = [
  { text: '全部科目', value: 'all' },
  { text: '数学', value: 'math' },
  { text: '物理', value: 'physics' },
  { text: '化学', value: 'chemistry' },
]

const statusOptions = [
  { text: '全部状态', value: 'all' },
  { text: '未掌握', value: 'pending' },
  { text: '巩固中', value: 'in_progress' },
  { text: '已掌握', value: 'mastered' },
]

const getSubjectText = (subject: string) => {
  const map: Record<string, string> = { math: '数学', physics: '物理', chemistry: '化学' }
  return map[subject] || subject
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = { pending: '未掌握', in_progress: '巩固中', mastered: '已掌握' }
  return map[status] || status
}

const loadQuestions = async () => {
  loading.value = true
  try {
    const res = await api.get('/admin/questions')
    let list: QuestionItem[] = res.data || []

    stats.value.total = list.length
    stats.value.pending = list.filter(q => q.status === 'pending').length
    stats.value.mastered = list.filter(q => q.status === 'mastered').length

    if (subjectFilter.value !== 'all') {
      list = list.filter(q => q.subject === subjectFilter.value)
    }
    if (statusFilter.value !== 'all') {
      list = list.filter(q => q.status === statusFilter.value)
    }

    questions.value = list
  } catch (error) {
    console.error('Failed to load questions:', error)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onRefresh = () => {
  loadQuestions()
}

const viewDetail = (item: QuestionItem) => {
  selectedQuestion.value = item
  showDetail.value = true
}

onMounted(() => {
  loadQuestions()
})
</script>

<style scoped>
.admin-questions {
  padding-bottom: 30px;
}
.box {
  background: #f7f8fa;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  margin-top: 4px;
}
</style>
