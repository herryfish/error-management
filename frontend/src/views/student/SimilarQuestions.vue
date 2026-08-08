<template>
  <div class="similar-questions-page">
    <van-nav-bar
      title="相似题推荐"
      left-arrow
      @click-left="$router.back()"
    />
    
    <van-list
      v-model:loading="loading"
      :finished="finished"
      @load="loadSimilarQuestions"
    >
      <div
        v-for="item in similarQuestions"
        :key="item.id"
        class="similar-card"
      >
        <div class="similar-header">
          <span class="similarity-tag">相似度: {(item.similarity * 100).toFixed(0)}%</span>
        </div>
        <div class="similar-content" v-html="renderMath(item.content)"></div>
        <div class="similar-footer">
          <van-button
            size="small"
            type="primary"
            round
            @click="startRedo(item.questionId)"
          >
            开始练习
          </van-button>
        </div>
      </div>
    </van-list>
    
    <van-empty
      v-if="!loading && similarQuestions.length === 0"
      description="暂无相似题"
    />
    
    <div
      v-if="similarQuestions.length > 0"
      class="actions"
    >
      <van-button
        type="default"
        block
        :loading="regenerating"
        @click="regenerate"
      >
        重新生成
      </van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'
import { renderMath } from '@/utils/math'
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
  padding: 12px 16px 80px;
  background-color: #f7f8fa;
  min-height: 100vh;
}

.similar-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.similar-header {
  margin-bottom: 8px;
}

.similarity-tag {
  font-size: 12px;
  color: #1989fa;
  background: #e8f4ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.similar-content {
  font-size: 14px;
  color: #323233;
  line-height: 1.6;
  margin-bottom: 12px;
}

.similar-footer {
  text-align: right;
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
