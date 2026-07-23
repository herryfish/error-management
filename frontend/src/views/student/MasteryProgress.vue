<template>
  <div>
    <van-nav-bar title="掌握进度" left-arrow @click-left="$router.back()" />
    <van-cell-group inset style="margin-top: 16px">
      <van-cell title="总题数" :value="stats.totalQuestions" />
      <van-cell title="已掌握" :value="`${stats.masteredQuestions} 题`" />
      <van-cell title="学习中" :value="`${stats.learningQuestions} 题`" />
      <van-cell title="新题" :value="`${stats.newQuestions} 题`" />
      <van-cell title="掌握率">
        <template #value>
          <van-progress :percentage="stats.masteryRate" stroke-width="8" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset style="margin-top: 16px" title="各状态题目">
      <van-empty v-if="records.length === 0" description="暂无掌握记录" />
      <van-cell
        v-for="r in records"
        :key="r.id"
        :title="statusText(r.status)"
        :label="`正确 ${r.correctCount} 次 · 错误 ${r.incorrectCount} 次`"
        :value="r.status === 'mastered' ? '已掌握' : r.status === 'learning' ? '学习中' : '新题'"
      />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { masteryService, type Mastery, type MasteryStats } from '@/services/mastery'

const userStore = useUserStore()
const stats = ref<MasteryStats>({ totalQuestions: 0, masteredQuestions: 0, learningQuestions: 0, newQuestions: 0, masteryRate: 0 })
const records = ref<Mastery[]>([])

const statusText = (s: string) => ({ new: '新题', learning: '学习中', mastered: '已掌握' }[s] || s)

onMounted(async () => {
  const studentId = userStore.user?.studentId || userStore.user?.id
  if (!studentId) return
  try {
    const [s, r] = await Promise.all([
      masteryService.getStats(studentId),
      masteryService.getByStudent(studentId),
    ])
    stats.value = s
    records.value = r
  } catch (e) { console.error(e) }
})
</script>
