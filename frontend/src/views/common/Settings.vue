<template>
  <div class="settings-page">
    <van-nav-bar title="设置" left-arrow @click-left="$router.back()" />
    
    <van-cell-group inset>
      <van-cell title="账号信息" is-link @click="$router.push('/account')" />
      <van-cell title="通知设置" is-link @click="$router.push('/notifications')" />
    </van-cell-group>
    
    <van-cell-group inset style="margin-top: 16px">
      <van-cell title="清除缓存" is-link @click="clearCache" />
      <van-cell title="关于我们" is-link @click="$router.push('/about')" />
    </van-cell-group>
    
    <div style="margin: 16px">
      <van-button type="danger" block @click="logout">退出登录</van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { showToast } from 'vant'

const router = useRouter()
const userStore = useUserStore()

const clearCache = () => {
  localStorage.clear()
  showToast('缓存已清除')
}

const logout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.settings-page {
  padding-bottom: 80px;
}
</style>