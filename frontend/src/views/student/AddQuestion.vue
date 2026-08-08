<template>
  <div class="add-question-page">
    <van-nav-bar
      title="录入错题"
      left-arrow
      @click-left="$router.back()"
    />
    
    <van-tabs v-model:active="activeTab">
      <van-tab title="手动录入">
        <van-form @submit="onSubmit">
          <van-cell-group inset>
            <van-field
              v-model="form.title"
              name="title"
              label="标题"
              placeholder="题目标题"
              :rules="[{ required: true, message: '请填写标题' }]"
            />
            <van-field
              v-model="form.content"
              type="textarea"
              rows="3"
              autosize
              name="content"
              label="题目内容"
              placeholder="请输入题目内容"
              :rules="[{ required: true, message: '请填写题目内容' }]"
            />
            <van-field
              name="subject"
              label="科目"
              :rules="[{ required: true, message: '请选择科目' }]"
            >
              <template #input>
                <van-radio-group v-model="form.subject" direction="horizontal">
                  <van-radio name="math">数学</van-radio>
                  <van-radio name="physics">物理</van-radio>
                  <van-radio name="chemistry">化学</van-radio>
                </van-radio-group>
              </template>
            </van-field>
            <van-field
              name="type"
              label="题型"
              :rules="[{ required: true, message: '请选择题型' }]"
            >
              <template #input>
                <van-radio-group v-model="form.type" direction="horizontal">
                  <van-radio name="choice">选择题</van-radio>
                  <van-radio name="fill">填空题</van-radio>
                  <van-radio name="answer">解答题</van-radio>
                </van-radio-group>
              </template>
            </van-field>
            <van-field
              v-model="form.difficulty"
              type="digit"
              name="difficulty"
              label="难度"
              placeholder="1-5"
            />
            <van-field
              v-model="knowledgePointsStr"
              name="knowledgePoints"
              label="知识点"
              placeholder="用逗号分隔"
            />
            <van-field
              v-model="form.answer"
              type="textarea"
              rows="2"
              name="answer"
              label="参考答案"
              placeholder="参考答案（可选）"
            />
            <van-field
              v-model="form.explanation"
              type="textarea"
              rows="2"
              name="explanation"
              label="解析"
              placeholder="解析（可选）"
            />
          </van-cell-group>
          <div style="margin: 16px">
            <van-button round block type="primary" native-type="submit" :loading="submitting">
              提交
            </van-button>
          </div>
        </van-form>
      </van-tab>
      
      <van-tab title="拍照识别">
        <div class="photo-section">
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            capture="environment"
            style="display: none"
            @change="onFileChange"
          />
          <div class="upload-content" @click="triggerFileInput">
            <template v-if="previewUrl">
              <img :src="previewUrl" style="max-width: 200px; max-height: 200px; border-radius: 8px;" />
            </template>
            <template v-else>
              <van-icon name="photograph" size="48" />
              <div>点击拍照或上传图片</div>
            </template>
          </div>
          
          <van-button
            v-if="selectedFile"
            type="primary"
            block
            :loading="identifying"
            style="margin-top: 16px;"
            @click="identifyQuestion"
          >
            AI识别
          </van-button>
          
          <div v-if="identifiedQuestion" class="identified-result">
            <van-cell-group inset>
              <van-cell
                title="识别可信度"
                :value="`${((identifiedQuestion.confidence || 0) * 100).toFixed(0)}%`"
              />
              <van-field v-model="identifiedQuestion.title" label="标题" placeholder="校验修改标题..." />
              <van-field v-model="identifiedQuestion.content" type="textarea" rows="3" label="内容" placeholder="校验修改题目内容..." />
              <van-field v-model="identifiedQuestion.answer" type="textarea" rows="2" label="答案" placeholder="校验修改答案..." />
            </van-cell-group>

            <!-- 公式实时渲染预览区 -->
            <div class="math-live-preview" style="margin-top: 16px; text-align: left;">
              <van-cell-group inset>
                <van-cell title="📐 实时公式渲染预览 (KaTeX)">
                  <template #label>
                    <div class="preview-box">
                      <div class="preview-title" v-html="renderMath(identifiedQuestion.title || '（标题暂无）')"></div>
                      <div class="preview-content" v-html="renderMath(identifiedQuestion.content || '（内容暂无）')"></div>
                    </div>
                  </template>
                </van-cell>
              </van-cell-group>
            </div>

            <button type="button" class="save-btn" @click="onSaveClick">
              确认并保存修改
            </button>
          </div>
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { questionService, type Question } from '@/services/questions'
import { renderMath } from '@/utils/math'
import { showToast, showConfirmDialog } from 'vant'

const router = useRouter()
const activeTab = ref(0)
const submitting = ref(false)
const identifying = ref(false)
const identifiedQuestion = ref<Question | null>(null)
const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const form = ref({
  title: '',
  content: '',
  subject: 'math',
  type: 'answer',
  difficulty: 1,
  answer: '',
  explanation: '',
})

const knowledgePointsStr = ref('')

const knowledgePoints = computed(() => {
  return knowledgePointsStr.value.split(',').map(s => s.trim()).filter(s => s)
})

watch(identifiedQuestion, (val) => {
  console.log('[watch] identifiedQuestion changed:', val ? 'has data' : 'null')
})

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const file = input.files[0]
    selectedFile.value = file
    previewUrl.value = URL.createObjectURL(file)
    showToast('图片已选择')
  }
}

const submitForm = async (force: boolean = false) => {
  submitting.value = true
  try {
    await questionService.create({
      ...form.value,
      knowledgePoints: knowledgePoints.value,
      ...(force ? { forceSave: true } : {})
    }, selectedFile.value || undefined)
    showToast('录入成功')
    router.back()
  } catch (error: any) {
    if (error.response?.status === 409 || error.status === 409 || error.code === 'DUPLICATE_QUESTION') {
      const data = error.response?.data?.data || error.data || {}
      showConfirmDialog({
        title: '检测到重复题目',
        message: '该题目已在你的错题本中存在，是否自动跳转查看？',
        confirmButtonText: '查看原错题',
        cancelButtonText: '仍要保存',
      }).then(() => {
        if (data.existingQuestionId) {
          router.push(`/student/questions/${data.existingQuestionId}`)
        } else {
          router.push('/student/questions')
        }
      }).catch(() => {
        submitForm(true)
      })
    } else {
      showToast(error.message || '录入失败')
    }
  } finally {
    submitting.value = false
  }
}

const onSubmit = async () => {
  await submitForm(false)
}

const identifyQuestion = async () => {
  if (!selectedFile.value) {
    showToast('请先上传图片')
    return
  }
  
  identifying.value = true
  try {
    const result = await questionService.identify(selectedFile.value)
    identifiedQuestion.value = result.data?.question || result.question || null
    showToast('识别成功')
  } catch (error: any) {
    showToast(error.message || '识别失败')
  } finally {
    identifying.value = false
  }
}

const onSaveClick = () => {
  saveIdentifiedQuestion()
}

const saveIdentifiedQuestion = async () => {
  if (!identifiedQuestion.value) return
  
  submitting.value = true
  try {
    await questionService.update(identifiedQuestion.value.id, {
      title: identifiedQuestion.value.title,
      content: identifiedQuestion.value.content,
      answer: identifiedQuestion.value.answer
    })
    showToast('保存成功')
    router.back()
  } catch (error: any) {
    showToast(error.message || '保存失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.add-question-page {
  padding-bottom: 80px;
}

.photo-section {
  padding: 16px;
  text-align: center;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 200px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  margin: 0 auto;
  cursor: pointer;
}

.identified-result {
  margin-top: 16px;
}

.preview-box {
  background: #f8f9fa;
  padding: 10px 12px;
  border-radius: 6px;
  color: #323233;
  margin-top: 6px;
}

.preview-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 6px;
}

.preview-content {
  font-size: 14px;
  color: #646566;
  line-height: 1.5;
}

.save-btn {
  width: 100%;
  padding: 12px;
  background: #1989fa;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 16px;
  margin-top: 16px;
  cursor: pointer;
}
</style>
