<template>
  <div>
    <van-nav-bar title="今日重做" left-arrow @click-left="$router.back()" />
    <van-empty v-if="!loading && records.length === 0" description="今日暂无重做记录" />
    <van-cell-group inset v-else>
      <van-cell
        v-for="r in records"
        :key="r.id"
        :title="r.isCorrect ? '正确' : '错误'"
        :label="`批改反馈: ${r.feedback || r.gradeResult || '无'}`"
        :value="r.createdAt?.substring(11, 16)"
      />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { redoService, type RedoRecord } from '@/services/redos'

const userStore = useUserStore()
const loading = ref(false)
const records = ref<RedoRecord[]>([])

onMounted(async () => {
  loading.value = true
  try {
    const studentId = userStore.user?.studentId || userStore.user?.id
    if (studentId) {
      const all = await redoService.getByStudent(studentId)
      const today = new Date().toISOString().substring(0, 10)
      records.value = all.filter(r => r.createdAt?.startsWith(today))
    }
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>
