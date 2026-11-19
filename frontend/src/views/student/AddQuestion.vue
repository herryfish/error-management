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
              name="errorTags"
              label="错因标签"
            >
              <template #input>
                <van-checkbox-group v-model="form.errorTags" direction="horizontal">
                  <van-checkbox
                    v-for="tag in ERROR_TAG_PRESETS"
                    :key="tag"
                    :name="tag"
                    shape="square"
                    style="margin-right: 8px; margin-bottom: 4px;"
                  >
                    {{ tag }}
                  </van-checkbox>
                </van-checkbox-group>
              </template>
            </van-field>
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
      
            <van-tab title="整页多题识别">
        <div class="photo-section">
          <input
            ref="multiFileInputRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="onMultiFileChange"
          />
          <div class="upload-content" @click="triggerMultiFileInput">
            <template v-if="multiPreviewUrl">
              <img :src="multiPreviewUrl" style="max-width: 200px; max-height: 200px; border-radius: 8px;" />
            </template>
            <template v-else>
              <van-icon name="description" size="48" />
              <div>点击上传整页试卷/作业图片</div>
            </template>
          </div>

          <van-button
            v-if="multiSelectedFile && !multiTaskId"
            type="primary"
            block
            :loading="multiIdentifying"
            style="margin-top: 16px;"
            @click="identifyMultiQuestions"
          >
            整页智能切分与识别
          </van-button>

          <!-- 异步识别进度（提交后立即返回 taskId，轮询进度，避免 Nginx 504） -->
          <div v-if="multiTaskId" class="multi-task-progress" style="margin-top: 16px;">
            <van-cell-group inset>
              <van-cell title="识别任务进行中" :label="multiTaskStateText">
                <template #value>
                  <van-tag :type="multiTaskFailed ? 'danger' : 'primary'">
                    {{ multiTaskFailed ? '失败' : `${multiTaskProgress}%` }}
                  </van-tag>
                </template>
              </van-cell>
              <van-cell>
                <template #label>
                  <van-progress :percentage="multiTaskProgress" stroke-width="6" />
                </template>
              </van-cell>
            </van-cell-group>
            <van-button
              size="small"
              plain
              style="margin-top: 8px;"
              @click="cancelMultiPolling"
            >
              {{ multiTaskFailed ? '重新开始' : '取消等待' }}
            </van-button>
          </div>

          <div v-if="multiItems && multiItems.length > 0" class="multi-items-list" style="margin-top: 16px; text-align: left;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 15px;">识别结果列表 (勾选需要导入的题目)：</div>
            <van-checkbox-group v-model="selectedMultiIds">
              <van-cell-group inset v-for="item in multiItems" :key="item.tempId" style="margin-bottom: 12px;">
                <van-cell clickable @click="toggleMultiItem(item.tempId)">
                  <template #title>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <van-checkbox :name="item.tempId" @click.stop />
                      <van-tag v-if="item.isDuplicate" type="warning" style="margin-left: 8px;">已存在错题</van-tag>
                    </div>
                  </template>
                  <template #label>
                    <div style="margin-top: 6px;">
                      <div class="item-title-field" style="margin-bottom: 4px;">
                        <van-field v-model="item.title" label="标题" placeholder="题目简短标题" />
                      </div>
                      <div class="item-content-field">
                        <van-field v-model="item.content" type="textarea" rows="2" label="题干" placeholder="题目内容" />
                      </div>
                      <div style="margin-top: 4px; color: #646566; font-size: 13px;" v-html="renderMath(item.content)"></div>
                    </div>
                  </template>
                </van-cell>
              </van-cell-group>
            </van-checkbox-group>

            <van-button
              type="success"
              block
              round
              :loading="batchSubmitting"
              style="margin-top: 16px;"
              @click="saveBatchQuestions"
            >
              一键批量导入选中的题目 ({{ selectedMultiIds.length }} 道)
            </van-button>
          </div>
        </div>
      </van-tab>
<van-tab title="拍照识别">
        <div class="photo-section">
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            
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
              <van-cell title="插图切割状态">
                <template #value>
                  <van-tag :type="(identifiedQuestion.diagramUrls?.length && identifiedQuestion.diagramUrls[0] !== identifiedQuestion.imageUrl) ? 'primary' : 'default'" size="medium">
                    {{ (identifiedQuestion.diagramUrls?.length && identifiedQuestion.diagramUrls[0] !== identifiedQuestion.imageUrl) ? '精细题图' : '局部原图 (已降级)' }}
                  </van-tag>
                </template>
              </van-cell>
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
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { questionService, type Question } from '@/services/questions'
import { renderMath } from '@/utils/math'
import { showToast, showConfirmDialog } from 'vant'

const router = useRouter()
const activeTab = ref(1)
const submitting = ref(false)
const identifying = ref(false)
const identifiedQuestion = ref<Question | null>(null)
const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const multiFileInputRef = ref<HTMLInputElement | null>(null)
const multiSelectedFile = ref<File | null>(null)
const multiPreviewUrl = ref('')
const multiIdentifying = ref(false)
const multiItems = ref<any[]>([])
const selectedMultiIds = ref<string[]>([])
const batchSubmitting = ref(false)

// 异步识别任务状态（taskId + 轮询）
const multiTaskId = ref('')
const multiTaskProgress = ref(0)
const multiTaskState = ref<'queued' | 'processing' | 'completed' | 'failed' | ''>('')
const multiTaskError = ref('')
let multiPollTimer: ReturnType<typeof setInterval> | null = null

const multiTaskFailed = computed(() => multiTaskState.value === 'failed')
const multiTaskStateText = computed(() => {
  switch (multiTaskState.value) {
    case 'queued':
      return '任务排队中，即将开始识别…'
    case 'processing':
      return `Vision 切题识别中（${multiTaskProgress.value}%），大图通常需要 15-30 秒`
    case 'failed':
      return multiTaskError.value || '识别任务失败，可重新上传再试'
    default:
      return ''
  }
})

const triggerMultiFileInput = () => {
  multiFileInputRef.value?.click()
}

const onMultiFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const file = input.files[0]
    multiSelectedFile.value = file
    multiPreviewUrl.value = URL.createObjectURL(file)
    // 换图时重置上一轮任务状态
    cancelMultiPolling()
    multiItems.value = []
    selectedMultiIds.value = []
    showToast('整页试卷图片已选择')
  }
}

const identifyMultiQuestions = async () => {
  if (!multiSelectedFile.value) {
    showToast('请先上传整页图片')
    return
  }
  multiIdentifying.value = true
  try {
    // 异步提交：立即返回 taskId，轮询进度，规避同步 HTTP 挂起导致的 Nginx 504
    const { taskId } = await questionService.identifyMultiAsync(multiSelectedFile.value)
    multiTaskId.value = taskId
    multiTaskState.value = 'queued'
    multiTaskProgress.value = 0
    multiTaskError.value = ''
    startMultiPolling()
  } catch (err: any) {
    showToast(err.message || '任务提交失败')
  } finally {
    multiIdentifying.value = false
  }
}

const MULTI_POLL_INTERVAL_MS = 2000
const MULTI_POLL_MAX_MS = 10 * 60 * 1000

const startMultiPolling = () => {
  stopMultiPolling()
  const startedAt = Date.now()
  multiPollTimer = setInterval(async () => {
    if (Date.now() - startedAt > MULTI_POLL_MAX_MS) {
      stopMultiPolling()
      multiTaskState.value = 'failed'
      multiTaskError.value = '识别超时，请重试或改用单题拍照录入'
      return
    }
    try {
      const task = await questionService.getMultiTaskStatus(multiTaskId.value)
      multiTaskState.value = task.state
      multiTaskProgress.value = task.progress || 0
      if (task.state === 'completed') {
        stopMultiPolling()
        multiItems.value = task.result?.items || []
        selectedMultiIds.value = multiItems.value.map(i => i.tempId)
        showToast('整页多题切分成功')
      } else if (task.state === 'failed') {
        stopMultiPolling()
        multiTaskError.value = task.error || '识别任务失败'
      }
    } catch (err: any) {
      // 404 等异常视为任务丢失，终止轮询
      stopMultiPolling()
      multiTaskState.value = 'failed'
      multiTaskError.value = err.message || '查询任务状态失败'
    }
  }, MULTI_POLL_INTERVAL_MS)
}

const stopMultiPolling = () => {
  if (multiPollTimer) {
    clearInterval(multiPollTimer)
    multiPollTimer = null
  }
}

const cancelMultiPolling = () => {
  stopMultiPolling()
  multiTaskId.value = ''
  multiTaskState.value = ''
  multiTaskProgress.value = 0
  multiTaskError.value = ''
}

onUnmounted(() => {
  stopMultiPolling()
})

const toggleMultiItem = (id: string) => {
  const index = selectedMultiIds.value.indexOf(id)
  if (index > -1) {
    selectedMultiIds.value.splice(index, 1)
  } else {
    selectedMultiIds.value.push(id)
  }
}

const saveBatchQuestions = async () => {
  const itemsToSave = multiItems.value.filter(i => selectedMultiIds.value.includes(i.tempId))
  if (itemsToSave.length === 0) {
    showToast('请至少勾选一道题目')
    return
  }
  batchSubmitting.value = true
  try {
    await questionService.createBatch(itemsToSave)
    showToast('批量导入成功！')
    router.push('/questions')
  } catch (err: any) {
    showToast(err.message || '批量保存失败')
  } finally {
    batchSubmitting.value = false
  }
}


const form = ref({
  title: '',
  content: '',
  subject: 'math',
  type: 'answer',
  difficulty: 1,
  answer: '',
  explanation: '',
  errorTags: [] as string[],
})

// 错因标签预设（与后端白名单一致）
const ERROR_TAG_PRESETS = ['审题不清', '计算粗心', '公式遗忘', '方法缺失', '其他']

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
          router.push(`/questions/${data.existingQuestionId}`)
        } else {
          router.push('/questions')
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
