<template>
  <div>
    <van-nav-bar title="薄弱知识点" left-arrow @click-left="$router.back()" />
    <van-empty v-if="!loading && weakItems.length === 0" description="暂无薄弱知识点，继续加油！" />
    <van-cell-group inset v-else>
      <van-cell
        v-for="item in weakItems"
        :key="item.id"
        :title="`薄弱题目 (ID: ${item.questionId?.substring(0, 8)})`"
        :label="`正确 ${item.correctCount} 次 · 错误 ${item.incorrectCount} 次`"
        is-link
        @click="$router.push(`/redo/add/${item.questionId}`)"
      />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { masteryService, type Mastery } from '@/services/mastery'

const userStore = useUserStore()
const loading = ref(false)
const weakItems = ref<Mastery[]>([])

onMounted(async () => {
  loading.value = true
  try {
    const studentId = userStore.user?.studentId || userStore.user?.id
    if (studentId) {
      const all = await masteryService.getByStudent(studentId)
      weakItems.value = all.filter(m => m.status !== 'mastered' && m.incorrectCount > 0)
    }
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>
