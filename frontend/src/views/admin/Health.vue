<template>
  <div class="admin-health">
    <van-nav-bar
      title="系统健康与状态"
      left-arrow
      @click-left="$router.back()"
    />

    <van-cell-group inset style="margin-top: 16px;">
      <van-cell title="整体状态" :value="healthData.database?.connected ? '正常 (Healthy)' : '异常 (Unhealthy)'" />
      <van-cell title="数据库连接" :value="healthData.database?.connected ? '已连通' : '未连接'" />
      <van-cell title="运行时间 (Uptime)" :value="formatUptime(healthData.uptime)" />
      <van-cell title="检查时间" :value="formatDate(healthData.timestamp)" />
    </van-cell-group>

    <van-cell-group inset title="内存使用率" style="margin-top: 16px;">
      <van-cell title="堆已用 (Heap Used)" :value="formatBytes(healthData.memory?.heapUsed)" />
      <van-cell title="堆总量 (Heap Total)" :value="formatBytes(healthData.memory?.heapTotal)" />
      <van-cell title="常驻内存 (RSS)" :value="formatBytes(healthData.memory?.rss)" />
    </van-cell-group>

    <div style="padding: 16px;">
      <van-button type="primary" block @click="loadHealth">刷新状态检查</van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/utils/api'

const healthData = ref<any>({})

const loadHealth = async () => {
  try {
    const res = await api.get('/admin/health')
    healthData.value = res.data || {}
  } catch (error) {
    console.error('Failed to load system health:', error)
  }
}

const formatUptime = (seconds?: number) => {
  if (!seconds) return '未知'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h}小时 ${m}分 ${s}秒`
}

const formatBytes = (bytes?: number) => {
  if (!bytes) return '0 MB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

onMounted(() => {
  loadHealth()
})
</script>

<style scoped>
.admin-health {
  padding-bottom: 30px;
}
</style>
