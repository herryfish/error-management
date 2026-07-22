<template>
  <div class="stats-page">
    <van-nav-bar
      title="统计信息"
      left-arrow
      @click-left="$router.back()"
    />
    
    <div
      v-if="stats"
      class="content"
    >
      <van-cell-group inset>
        <van-cell
          title="总题目数"
          :value="`${stats.totalQuestions}道`"
        />
        <van-cell
          title="总重做次数"
          :value="`${stats.totalRedos}次`"
        />
        <van-cell
          title="正确次数"
          :value="`${stats.correctRedos}次`"
        />
        <van-cell
          title="正确率"
          :value="`${stats.accuracyRate}%`"
        />
      </van-cell-group>
      
      <van-cell-group
        inset
        style="margin-top: 16px"
      >
        <van-cell title="掌握统计" />
        <van-cell
          title="总题目"
          :value="`${stats.masteryStats.total}道`"
        />
        <van-cell
          title="已掌握"
          :value="`${stats.masteryStats.mastered}道`"
        />
        <van-cell
          title="学习中"
          :value="`${stats.masteryStats.learning}道`"
        />
        <van-cell
          title="新题目"
          :value="`${stats.masteryStats.new}道`"
        />
        <van-cell
          title="掌握率"
          :value="`${stats.masteryRate}%`"
        />
      </van-cell-group>
    </div>
    
    <van-empty
      v-else-if="!loading"
      description="暂无统计数据"
    />
    
    <van-loading
      v-if="loading"
      class="loading"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { reportService, type Stats } from '@/services/reports'

const stats = ref<Stats | null>(null)
const loading = ref(false)

const loadStats = async () => {
  loading.value = true
  try {
    stats.value = await reportService.getStats()
  } catch (error) {
    console.error('Failed to load stats:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.stats-page {
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