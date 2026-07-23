<template>
  <div>
    <van-nav-bar title="账号信息" left-arrow @click-left="$router.back()" />
    <van-cell-group inset style="margin-top: 16px">
      <van-cell title="用户名" :value="user?.username || '-'" />
      <van-cell title="角色" :value="roleText" />
      <van-cell title="用户ID" :value="user?.id?.substring(0, 8) || '-'" />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const user = computed(() => userStore.user)
const roleMap: Record<string, string> = { student: '学生', parent: '家长', admin: '管理员' }
const roleText = computed(() => user.value?.role ? roleMap[user.value.role] || user.value.role : '-')
</script>
