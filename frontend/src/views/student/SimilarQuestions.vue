<template>
  <div class="similar-questions-page">
    <van-nav-bar title="相似题" left-arrow @click-left="$router.back()" />
    
    <van-list v-model:loading="loading" :finished="finished" @load="loadSimilarQuestions">
      <van-cell v-for="item in similarQuestions" :key="item.id" :title="item.content" :label="`相似度: ${(item.similarity * 100).toFixed(0)}%`">
        <template #right-icon>
          <van-button size="small" type="primary" @click="startRedo(item.questionId)">开始练习</van-button>
        </template>
      </van-cell>
    </van-list>
    
    <van-empty v-if="!loading && similarQuestions.length === 0" description="暂无相似题" />
    
    <div class="actions" v-if="similarQuestions.length > 0">
      <van-button type="default" block @click="regenerate" :loading="regenerating">重新生成</van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'
import { showToast } from 'vant'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const finished = ref(false)
const regenerating = ref(false)
const similarQuestions = ref<any[]>([])

const loadSimilarQuestions = async () => {
  try {
    const questionId = route.params.questionId as string
    const response = await api.get(`/similar/question/${questionId}`)
    similarQuestions.value = response.data
    finished.value = true
  } catch (error) {
    console.error('Failed to load similar questions:', error)
  } finally {
    loading.value = false
  }
}

const startRedo = (questionId: string) => {
  router.push(`/redo/add/${questionId}`)
}

const regenerate = async () => {
  regenerating.value = true
  try {
    const questionId = route.params.questionId as string
    await api.post('/similar', { questionId })
    showToast('已重新生成')
    await loadSimilarQuestions()
  } catch (error) {
    showToast('生成失败')
    console.error('Failed to regenerate:', error)
  } finally {
    regenerating.value = false
  }
}

onMounted(() => {
  loadSimilarQuestions()
})
</script>

<style scoped>
.similar-questions-page {
  padding-bottom: 80px;
}

.actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: white;
}
</style>