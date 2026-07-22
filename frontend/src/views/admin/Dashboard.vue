<template>
  <div class="admin-dashboard">
    <van-nav-bar
      title="管理员端"
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
        title="系统状态"
        is-link
        :value="healthStatus"
        @click="$router.push('/admin/health')"
      />
      <van-cell
        title="用户统计"
        is-link
        :value="`${stats.totalUsers}人`"
        @click="$router.push('/admin/users')"
      />
      <van-cell
        title="LLM用量"
        is-link
        :value="`${stats.totalLLMCalls}次`"
        @click="$router.push('/admin/llm')"
      />
    </van-cell-group>
    
    <van-cell-group
      inset
      style="margin-top: 16px"
    >
      <van-cell
        title="用户管理"
        is-link
        @click="$router.push('/admin/users')"
      />
      <van-cell
        title="系统配置"
        is-link
        @click="$router.push('/admin/config')"
      />
      <van-cell
        title="系统健康"
        is-link
        @click="$router.push('/admin/health')"
      />
      <van-cell
        title="错题统计"
        is-link
        @click="$router.push('/admin/questions')"
      />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/utils/api'

const healthStatus = ref('正常')
const stats = ref({
  totalUsers: 0,
  totalLLMCalls: 0,
})

onMounted(async () => {
  try {
    const response = await api.get('/admin/stats')
    stats.value = {
      totalUsers: response.data.users.total,
      totalLLMCalls: response.data.llm.totalCalls,
    }
  } catch (error) {
    console.error('Failed to load admin stats:', error)
  }
})
</script>

<style scoped>
.admin-dashboard {
  padding: 16px;
  padding-bottom: 80px;
}
</style>