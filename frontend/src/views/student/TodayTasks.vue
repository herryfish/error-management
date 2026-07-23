<template>
  <div>
    <van-nav-bar title="今日任务" left-arrow @click-left="$router.back()" />
    <van-pull-refresh v-model="loading" @refresh="loadData">
      <van-empty v-if="!loading && tasks.length === 0" description="今日暂无任务" />
      <van-cell-group inset v-else>
        <van-cell
          v-for="item in tasks"
          :key="item.id"
          :title="`复习题目 (ID: ${item.questionId?.substring(0, 8)})`"
          :label="`间隔 ${item.intervalLevel} 天 · 正确 ${item.correctCount} 次`"
          is-link
          @click="$router.push(`/redo/add/${item.questionId}`)"
        />
      </van-cell-group>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { masteryService, type Mastery } from '@/services/mastery'

const userStore = useUserStore()
const loading = ref(false)
const tasks = ref<Mastery[]>([])

const loadData = async () => {
  loading.value = true
  try {
    const studentId = userStore.user?.studentId || userStore.user?.id
    if (studentId) {
      tasks.value = await masteryService.getReviewQueue(studentId)
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
