<template>
  <div class="redo-page">
    <van-nav-bar
      title="重做题目"
      left-arrow
      @click-left="$router.back()"
    />
    
    <div
      v-if="question"
      class="content"
    >
      <van-cell-group inset>
        <van-cell
          :title="question.title"
          :label="`${getSubjectText(question.subject)} · ${getTypeText(question.type)}`"
        />
      </van-cell-group>
      
      <van-cell-group
        inset
        style="margin-top: 16px"
      >
        <van-cell title="题目内容">
          <div class="question-content" v-html="renderMath(question.content)"></div>
        </van-cell>
      </van-cell-group>
      
      <van-cell-group
        inset
        style="margin-top: 16px"
      >
        <van-field
          v-model="answer"
          type="textarea"
          rows="4"
          autosize
          placeholder="请输入你的答案"
        />
      </van-cell-group>
      
      <div class="upload-section">
        <van-uploader
          v-model="fileList"
          :max-count="1"
          :after-read="afterRead"
          accept="image/*"
        >
          <template #default>
            <div class="upload-content">
              <van-icon
                name="photograph"
                size="24"
              />
              <div>拍照上传</div>
            </div>
          </template>
        </van-uploader>
      </div>
      
      <div class="actions">
        <van-button
          type="primary"
          block
          :loading="submitting"
          @click="submitRedo"
        >
          提交
        </van-button>
        <van-button
          type="default"
          block
          @click="showHint"
        >
          提示
        </van-button>
      </div>

      <van-dialog
        v-model:show="showHintDialog"
        title="题目提示"
        show-cancel-button
        confirm-text="我知道了"
        cancel-text="关闭"
      >
        <div style="padding: 16px;">
          <div v-if="question.answer" style="margin-bottom: 12px;">
            <div style="font-weight: bold; color: #1989fa; margin-bottom: 4px;">参考答案：</div>
            <div v-html="renderMath(question.answer)"></div>
          </div>
          <div v-if="question.explanation" style="margin-bottom: 12px;">
            <div style="font-weight: bold; color: #1989fa; margin-bottom: 4px;">解析：</div>
            <div v-html="renderMath(question.explanation)"></div>
          </div>
          <div v-if="question.knowledgePoints?.length">
            <div style="font-weight: bold; color: #1989fa; margin-bottom: 4px;">知识点：</div>
            <van-tag v-for="p in question.knowledgePoints" :key="p" type="primary" style="margin-right: 6px; margin-bottom: 4px;">{{ p }}</van-tag>
          </div>
          <div v-if="!question.answer && !question.explanation" style="color: #999; text-align: center;">
            暂无提示信息，请先自行思考
          </div>
        </div>
      </van-dialog>
    </div>
    
    <van-empty
      v-else
      description="加载中..."
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { questionService, type Question } from '@/services/questions'
import { redoService } from '@/services/redos'
import { showToast } from 'vant'
import { renderMath } from '@/utils/math'

const route = useRoute()
const router = useRouter()
const question = ref<Question | null>(null)
const answer = ref('')
const fileList = ref<any[]>([])
const submitting = ref(false)
const showHintDialog = ref(false)

const loadQuestion = async () => {
  try {
    const id = route.params.questionId as string
    question.value = await questionService.getById(id)
  } catch (error) {
    console.error('Failed to load question:', error)
  }
}

const afterRead = (file: any) => {
  file.status = 'done'
}

const submitRedo = async () => {
  if (!answer.value && fileList.value.length === 0) {
    showToast('请输入答案或上传图片')
    return
  }
  
  submitting.value = true
  try {
    const rawFile = fileList.value.length > 0 ? (fileList.value[0].file?.raw || fileList.value[0].file || fileList.value[0]) : undefined
    if (rawFile && (rawFile instanceof File || (rawFile.name && rawFile.size))) {
      await redoService.createPhotoRedo(question.value!.id, rawFile)
    } else {
      await redoService.create({
        questionId: question.value!.id,
        answer: answer.value,
      })
    }
    showToast('提交成功')
    router.back()
  } catch (error) {
    showToast('提交失败')
    console.error('Failed to submit redo:', error)
  } finally {
    submitting.value = false
  }
}

const showHint = () => {
  showHintDialog.value = true
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
.redo-page {
  padding-bottom: 100px;
}

.content {
  padding: 16px;
}

.question-content {
  white-space: pre-wrap;
  line-height: 1.6;
}

.upload-section {
  margin: 16px;
  text-align: center;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  border: 1px dashed #ddd;
  border-radius: 8px;
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