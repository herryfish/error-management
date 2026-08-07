<template>
  <div class="admin-dashboard">
    <van-nav-bar title="管理员控制台" />
    
    <van-notice-bar
      left-icon="volume-o"
      text="提示：可在此监控系统运行指标、控制全局配置及查看 LLM 用量分布。"
    />
    
    <van-grid :column-num="2" style="margin: 16px 0;">
      <van-grid-item text="总用户量" :badge="stats.users?.total || 0" icon="user-o" />
      <van-grid-item text="错题总数" :badge="stats.questions?.total || 0" icon="orders-o" />
      <van-grid-item text="重做总数" :badge="stats.redos?.total || 0" icon="records" />
      <van-grid-item text="LLM成功率" :badge="`${stats.llm?.successRate || 0}%`" icon="fire-o" />
    </van-grid>
    
    <van-cell-group inset title="管理与监控功能">
      <van-cell
        title="用户管理"
        is-link
        to="/admin/users"
        icon="user-o"
      />
      <van-cell
        title="错题统计与管理"
        is-link
        to="/admin/questions"
        icon="orders-o"
      />
      <van-cell
        title="系统健康与状态"
        is-link
        to="/admin/health"
        icon="desktop-o"
      />
      <van-cell
        title="系统配置管理"
        is-link
        to="/admin/config"
        icon="setting-o"
      />
      <van-cell
        title="LLM 用量监控"
        is-link
        to="/admin/llm"
        icon="chart-trending-o"
      />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/utils/api'

const stats = ref<any>({})

const loadStats = async () => {
  try {
    const response = await api.get('/admin/stats')
    if (response.data) {
      stats.value = response.data
    }
  } catch (error) {
    console.error('Failed to load system stats:', error)
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.admin-dashboard {
  padding-bottom: 30px;
}
</style>
