<template>
  <div class="weekly-report-page">
    <van-nav-bar
      title="周报"
      left-arrow
      @click-left="$router.back()"
    />
    
    <div
      v-if="report"
      class="content"
    >
      <van-cell-group inset>
        <van-cell
          title="报告周期"
          :value="`${formatDate(report.weekStart)} - ${formatDate(report.weekEnd)}`"
        />
        <van-cell
          title="录入题目"
          :value="`${report.totalQuestions}道`"
        />
        <van-cell
          title="重做次数"
          :value="`${report.totalRedos}次`"
        />
        <van-cell
          title="已掌握"
          :value="`${report.masteredQuestions}道`"
        />
        <van-cell
          title="掌握率"
          :value="`${report.masteryRate}%`"
        />
        <van-cell
          title="相似题生成"
          :value="`${report.similarQuestionsGenerated}道`"
        />
      </van-cell-group>
      
      <van-cell-group
        v-if="report.weakPoints?.length"
        inset
        style="margin-top: 16px"
      >
        <van-cell title="薄弱知识点">
          <van-tag
            v-for="point in report.weakPoints"
            :key="point"
            type="danger"
            style="margin-right: 8px; margin-bottom: 8px;"
          >
            {{ point }}
          </van-tag>
        </van-cell>
      </van-cell-group>
    </div>
    
    <van-empty
      v-else-if="!loading"
      description="暂无周报数据"
    />
    
    <van-loading
      v-if="loading"
      class="loading"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { reportService, type WeeklyReport } from '@/services/reports'

const report = ref<WeeklyReport | null>(null)
const loading = ref(false)

const loadReport = async () => {
  loading.value = true
  try {
    report.value = await reportService.getWeeklyReport()
  } catch (error) {
    console.error('Failed to load report:', error)
  } finally {
    loading.value = false
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

onMounted(() => {
  loadReport()
})
</script>

<style scoped>
.weekly-report-page {
  padding-bottom: 80px;
}

.content {
  padding: 16px;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}
</style>