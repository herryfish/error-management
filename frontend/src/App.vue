<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await userStore.fetchUser()
  }
})
</script>

<style>
#app {
  min-height: 100vh;
  background-color: #f5f5f5;
}
</style>