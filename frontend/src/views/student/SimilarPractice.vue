<template>
  <div>
    <van-nav-bar title="相似题练习" left-arrow @click-left="$router.back()" />
    <van-empty v-if="!loading && questions.length === 0" description="暂无相似题，请先录入错题" />
    <van-cell-group inset v-else>
      <van-cell
        v-for="q in questions"
        :key="q.id"
        :title="q.title"
        :label="`${q.subject} · 难度${q.difficulty}`"
        is-link
        @click="$router.push(`/similar/${q.id}`)"
      />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { questionService, type Question } from '@/services/questions'

const userStore = useUserStore()
const loading = ref(false)
const questions = ref<Question[]>([])

onMounted(async () => {
  loading.value = true
  try {
    const studentId = userStore.user?.studentId || userStore.user?.id
    if (studentId) {
      questions.value = await questionService.getByStudent(studentId)
    }
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>
