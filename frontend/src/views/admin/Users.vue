<template>
  <div class="admin-users-page">
    <van-nav-bar
      title="用户管理"
      left-arrow
      @click-left="$router.back()"
    />
    
    <van-search
      v-model="searchKeyword"
      placeholder="搜索用户"
    />
    
    <van-list
      v-model:loading="loading"
      :finished="finished"
      @load="loadUsers"
    >
      <van-cell
        v-for="user in users"
        :key="user.id"
        :title="user.username"
        :label="getRoleText(user.role)"
      >
        <template #right-icon>
          <van-tag :type="getRoleType(user.role)">
            {{ getRoleText(user.role) }}
          </van-tag>
        </template>
      </van-cell>
    </van-list>
    
    <van-empty
      v-if="!loading && users.length === 0"
      description="暂无用户"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/utils/api'

const loading = ref(false)
const finished = ref(false)
const users = ref<any[]>([])
const searchKeyword = ref('')

const loadUsers = async () => {
  try {
    const response = await api.get('/admin/users')
    users.value = response.data
    finished.value = true
  } catch (error) {
    console.error('Failed to load users:', error)
  } finally {
    loading.value = false
  }
}

const getRoleType = (role: string): 'primary' | 'success' | 'warning' | 'default' => {
  const types: Record<string, 'primary' | 'success' | 'warning' | 'default'> = {
    student: 'primary',
    parent: 'success',
    admin: 'warning',
  }
  return types[role] || 'default'
}

const getRoleText = (role: string) => {
  const texts: Record<string, string> = {
    student: '学生',
    parent: '家长',
    admin: '管理员',
  }
  return texts[role] || role
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.admin-users-page {
  padding-bottom: 80px;
}
</style>