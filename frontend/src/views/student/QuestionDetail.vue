<template>
  <div class="question-detail">
    <van-nav-bar title="题目详情" left-arrow @click-left="$router.back()" />
    
    <div v-if="question" class="content">
      <van-cell-group inset>
        <van-cell :title="question.title" :label="`${getSubjectText(question.subject)} · ${getTypeText(question.type)} · 难度${question.difficulty}`" />
      </van-cell-group>
      
      <van-cell-group inset style="margin-top: 16px">
        <van-cell title="题目内容">
          <div class="question-content">{{ question.content }}</div>
        </van-cell>
        <van-cell v-if="question.answer" title="参考答案">
          <div class="answer-content">{{ question.answer }}</div>
        </van-cell>
        <van-cell v-if="question.explanation" title="解析">
          <div class="explanation-content">{{ question.explanation }}</div>
        </van-cell>
      </van-cell-group>
      
      <van-cell-group inset style="margin-top: 16px" v-if="question.knowledgePoints?.length">
        <van-cell title="知识点">
          <van-tag v-for="point in question.knowledgePoints" :key="point" type="primary" style="margin-right: 8px; margin-bottom: 8px;">
            {{ point }}
          </van-tag>
        </van-cell>
      </van-cell-group>
      
      <div class="actions">
        <van-button type="primary" block @click="startRedo">开始重做</van-button>
        <van-button type="default" block @click="viewSimilar">查看相似题</van-button>
      </div>
    </div>
    
    <van-empty v-else description="加载中..." />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { questionService, type Question } from '@/services/questions'

const route = useRoute()
const router = useRouter()
const question = ref<Question | null>(null)

const loadQuestion = async () => {
  try {
    const id = route.params.id as string
    question.value = await questionService.getById(id)
  } catch (error) {
    console.error('Failed to load question:', error)
  }
}

const startRedo = () => {
  router.push(`/redo/add/${question.value?.id}`)
}

const viewSimilar = () => {
  router.push(`/similar/${question.value?.id}`)
}

const getSubjectText = (subject: string) => {
  const texts: Record<string, string> = {
    math: '数学',
    physics: '物理',
    chemistry: '化学',
  }
  return texts[subject] || subject
}

const getTypeText = (type: string) => {
  const texts: Record<string, string> = {
    choice: '选择题',
    fill: '填空题',
    answer: '解答题',
  }
  return texts[type] || type
}

onMounted(() => {
  loadQuestion()
})
</script>

<style scoped>
.question-detail {
  padding-bottom: 100px;
}

.content {
  padding: 16px;
}

.question-content,
.answer-content,
.explanation-content {
  white-space: pre-wrap;
  line-height: 1.6;
}

.actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: white;
  display: flex;
  gap: 12px;
}

.actions .van-button {
  flex: 1;
}
</style>