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
    
    <van-cell-group inset>
      <van-cell
        title="周报"
        is-link
        value="查看"
        @click="$router.push('/reports/weekly')"
      />
      <van-cell
        title="掌握率"
        is-link
        :value="`${stats.masteryRate}%`"
        @click="$router.push('/mastery')"
      />
      <van-cell
        title="本周重做"
        is-link
        :value="`${stats.totalRedos}次`"
        @click="$router.push('/records')"
      />
    </van-cell-group>
    
    <van-cell-group
      inset
      style="margin-top: 16px"
    >
      <van-cell
        title="错题明细"
        is-link
        @click="$router.push('/questions')"
      />
      <van-cell
        title="学习记录"
        is-link
        @click="$router.push('/records')"
      />
      <van-cell
        title="统计信息"
        is-link
        @click="$router.push('/reports/stats')"
      />
    </van-cell-group>
    
    <van-cell-group
      inset
      style="margin-top: 16px"
    >
      <van-cell
        title="孩子信息"
        is-link
        @click="$router.push('/child')"
      />
      <van-cell
        title="绑定管理"
        is-link
        @click="$router.push('/bind')"
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
  padding: 16px;
  padding-bottom: 80px;
}
</style>