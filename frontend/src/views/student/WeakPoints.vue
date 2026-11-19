<template>
  <div>
    <van-nav-bar title="薄弱知识点" left-arrow @click-left="$router.back()" />

    <!-- 顽固薄弱点置顶区：累计做错 ≥ 阈值自动标记，建议线下定向补课 -->
    <van-cell-group v-if="stubbornItems.length > 0" inset title="⚠️ 顽固薄弱点（建议线下定向补课，避免机械重试）">
      <van-cell
        v-for="item in stubbornItems"
        :key="`stubborn-${item.id}`"
        :title="item.question?.title || `题目 (ID: ${item.questionId?.substring(0, 8)})`"
        :label="`累计做错 ${item.incorrectCount} 次${item.stubbornMarkedAt ? ' · ' + formatDate(item.stubbornMarkedAt) + ' 打标' : ''}`"
        is-link
        @click="$router.push(`/redo/add/${item.questionId}`)"
      >
        <template #value>
          <van-tag type="danger">顽固</van-tag>
        </template>
      </van-cell>
    </van-cell-group>

    <van-empty
      v-if="!loading && stubbornItems.length === 0 && weakItems.length === 0"
      description="暂无薄弱知识点，继续加油！"
    />
    <van-cell-group
      v-else-if="weakItems.length > 0"
      inset
      title="其他薄弱题目（错误次数多于正确次数）"
    >
      <van-cell
        v-for="item in weakItems"
        :key="item.id"
        :title="item.question?.title || `薄弱题目 (ID: ${item.questionId?.substring(0, 8)})`"
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
// 顽固薄弱点（后端按累计做错阈值打标）
const stubbornItems = ref<Mastery[]>([])
// 其他薄弱题目（错误次数多于正确次数，排除顽固置顶区已展示的）
const weakItems = ref<Mastery[]>([])

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

onMounted(async () => {
  loading.value = true
  try {
    const studentId = userStore.user?.studentId || userStore.user?.id
    if (studentId) {
      const all = await masteryService.getByStudent(studentId)
      stubbornItems.value = all.filter(m => m.isStubborn && m.status !== 'mastered')
      const stubbornIds = new Set(stubbornItems.value.map(m => m.id))
      weakItems.value = all.filter(
        m => m.status !== 'mastered' && m.incorrectCount > m.correctCount && !stubbornIds.has(m.id)
      )
    }
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>
