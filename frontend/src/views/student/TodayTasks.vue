<template>
  <div>
    <van-nav-bar
      title="今日任务"
      left-arrow
      @click-left="$router.back()"
    />
    <van-pull-refresh
      v-model="loading"
      @refresh="loadData"
    >
      <van-empty
        v-if="!loading && tasks.length === 0"
        description="今日暂无到期复习，继续保持！"
      />
      <van-cell-group
        v-else
        inset
        title="按艾宾浩斯间隔（第1/2/4/7/15天）到期"
      > 
        <van-cell
          v-for="item in tasks"
          :key="item.id"
          :title="item.question?.title || `复习题目 (ID: ${item.questionId?.substring(0, 8)})`"
          :label="`第 ${item.intervalLevel}/${totalRungs} 轮间隔复习 · 正确 ${item.correctCount} 次 · 错误 ${item.incorrectCount} 次`"
          is-link
          @click="$router.push(`/redo/add/${item.questionId}`)"
        >
          <template #value>
            <van-tag type="primary">
              去复习
            </van-tag>
          </template>
        </van-cell>
      </van-cell-group>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { masteryService, type Mastery } from '@/services/mastery'

const EBBINGHAUS_TOTAL_RUNGS = 5
const totalRungs = EBBINGHAUS_TOTAL_RUNGS

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
