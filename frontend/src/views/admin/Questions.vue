<template>
  <div class="admin-questions-page">
    <van-nav-bar
      title="错题统计与管理"
      left-arrow
      @click-left="$router.back()"
    />

    <!-- 指标概览卡片 -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-num">{{ stats.total }}</div>
        <div class="stat-label">题目总数</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-num">{{ stats.unmastered }}</div>
        <div class="stat-label">未掌握</div>
      </div>
      <div class="stat-card success">
        <div class="stat-num">{{ stats.mastered }}</div>
        <div class="stat-label">已掌握</div>
      </div>
    </div>

    <!-- 筛选条件 -->
    <van-dropdown-menu>
      <van-dropdown-item v-model="filterSubject" :options="subjectOptions" @change="fetchQuestions" />
      <van-dropdown-item v-model="filterStatus" :options="statusOptions" @change="fetchQuestions" />
    </van-dropdown-menu>

    <!-- 题目列表 -->
    <van-list
      v-model:loading="loading"
      :finished="finished"
      finished-text="没有更多了"
      @load="fetchQuestions"
    >
      <div
        v-for="item in questionList"
        :key="item.id"
        class="admin-question-item"
        @click="showDetail(item)"
      >
        <div class="item-header">
          <span class="item-title" v-html="renderMath(item.title)"></span>
          <van-tag :type="getSubjectTagType(item.subject)">{{ getSubjectName(item.subject) }}</van-tag>
        </div>
        <div class="item-content" v-html="renderMath(item.content)"></div>
        <div class="item-meta">
          <span>难度: {{ item.difficulty }}</span>
          <span>时间: {{ formatDate(item.createdAt) }}</span>
        </div>
      </div>
    </van-list>

    <!-- 题目详情弹窗 -->
    <van-popup v-model:show="showPopup" round position="bottom" :style="{ height: '70%' }">
      <div v-if="selectedQuestion" class="detail-popup">
        <h3 v-html="renderMath(selectedQuestion.title)"></h3>
        <div class="section-title">题干内容：</div>
        <div class="popup-box" v-html="renderMath(selectedQuestion.content)"></div>
        
        <div class="section-title">参考答案：</div>
        <div class="popup-box" v-html="renderMath(selectedQuestion.answer || '暂无答案')"></div>

        <div class="section-title">详细解析：</div>
        <div class="popup-box" v-html="renderMath(selectedQuestion.explanation || '暂无解析')"></div>

        <div style="margin-top: 20px;">
          <van-button block round type="default" @click="showPopup = false">关闭</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { questionService, type Question } from '@/services/questions'
import { renderMath } from '@/utils/math'

const stats = ref({ total: 0, unmastered: 0, mastered: 0 })
const loading = ref(false)
const finished = ref(false)
const questionList = ref<Question[]>([])
const selectedQuestion = ref<Question | null>(null)
const showPopup = ref(false)

const filterSubject = ref('all')
const filterStatus = ref('all')

const subjectOptions = [
  { text: '全部科目', value: 'all' },
  { text: '数学', value: 'math' },
  { text: '物理', value: 'physics' },
  { text: '化学', value: 'chemistry' }
]

const statusOptions = [
  { text: '全部状态', value: 'all' },
  { text: '待复习/未掌握', value: 'unmastered' },
  { text: '已掌握', value: 'mastered' }
]

const fetchQuestions = async () => {
  loading.value = true
  try {
    const list = await questionService.getAll()
    stats.value.total = list.length
    stats.value.mastered = list.filter(q => q.masteryLevel && q.masteryLevel >= 3).length
    stats.value.unmastered = stats.value.total - stats.value.mastered

    let filtered = list
    if (filterSubject.value !== 'all') {
      filtered = filtered.filter(q => q.subject === filterSubject.value)
    }
    if (filterStatus.value === 'mastered') {
      filtered = filtered.filter(q => q.masteryLevel && q.masteryLevel >= 3)
    } else if (filterStatus.value === 'unmastered') {
      filtered = filtered.filter(q => !q.masteryLevel || q.masteryLevel < 3)
    }
    questionList.value = filtered
    finished.value = true
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const showDetail = (item: Question) => {
  selectedQuestion.value = item
  showPopup.value = true
}

const getSubjectName = (sub: string) => {
  const map: Record<string, string> = { math: '数学', physics: '物理', chemistry: '化学' }
  return map[sub] || sub
}

const getSubjectTagType = (sub: string) => {
  const map: Record<string, 'primary' | 'success' | 'warning'> = { math: 'primary', physics: 'success', chemistry: 'warning' }
  return map[sub] || 'primary'
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  return dateStr.substring(0, 10)
}

onMounted(() => {
  fetchQuestions()
})
</script>

<style scoped>
.admin-questions-page {
  padding: 12px 16px 40px;
  background-color: #f7f8fa;
  min-height: 100vh;
}

.stats-overview {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.stat-card {
  flex: 1;
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.stat-card.warning .stat-num { color: #ee0a24; }
.stat-card.success .stat-num { color: #07c160; }

.stat-num {
  font-size: 20px;
  font-weight: bold;
  color: #1989fa;
}

.stat-label {
  font-size: 12px;
  color: #969799;
  margin-top: 2px;
}

.admin-question-item {
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 6px;
}

.item-content {
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
  margin-bottom: 8px;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #969799;
  border-top: 1px solid #f2f3f5;
  padding-top: 6px;
}

.detail-popup {
  padding: 20px;
}

.section-title {
  font-weight: bold;
  margin-top: 12px;
  margin-bottom: 6px;
  color: #323233;
}

.popup-box {
  background: #f7f8fa;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.5;
}
</style>
