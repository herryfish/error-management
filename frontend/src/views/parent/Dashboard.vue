<template>
  <div class="parent-dashboard">
    <van-nav-bar
      title="家长端"
      left-arrow
      @click-left="$router.back()"
    >
      <template #right>
        <van-icon
          name="setting-o"
          @click="$router.push('/settings')"
        />
      </template>
    </van-nav-bar>

    <div class="section-title">学习概况</div>
    <van-cell-group inset>
      <van-cell
        title="周报"
        is-link
        value="查看周报"
        @click="$router.push('/reports/weekly')"
      />
      <van-cell
        title="掌握率"
        is-link
        :value="`${stats.masteryRate}%`"
        @click="$router.push('/parent/questions')"
      />
      <van-cell
        title="本周重做"
        is-link
        :value="`${stats.totalRedos}次`"
        @click="$router.push('/reports/stats')"
      />
    </van-cell-group>
    
    <div class="section-title">错题与统计</div>
    <van-cell-group inset>
      <van-cell
        title="孩子错题明细"
        is-link
        icon="orders-o"
        @click="$router.push('/parent/questions')"
      />
      <van-cell
        title="统计信息"
        is-link
        icon="chart-trending-o"
        @click="$router.push('/reports/stats')"
      />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { reportService } from '@/services/reports'

const stats = ref({
  masteryRate: 0,
  totalRedos: 0,
})

onMounted(async () => {
  try {
    const reportData = await reportService.getStats()
    stats.value = {
      masteryRate: reportData.masteryRate,
      totalRedos: reportData.totalRedos,
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
})
</script>

<style scoped>
.parent-dashboard {
  padding: 12px;
  padding-bottom: 80px;
  background-color: #f7f8fa;
  min-height: 100vh;
}

.section-title {
  font-size: 14px;
  color: #969799;
  margin: 16px 12px 8px;
  font-weight: 500;
}
</style>
