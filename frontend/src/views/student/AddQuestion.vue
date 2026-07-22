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
                <van-radio-group
                  v-model="form.subject"
                  direction="horizontal"
                >
                  <van-radio name="math">
                    数学
                  </van-radio>
                  <van-radio name="physics">
                    物理
                  </van-radio>
                  <van-radio name="chemistry">
                    化学
                  </van-radio>
                </van-radio-group>
              </template>
            </van-field>
            <van-field
              name="type"
              label="题型"
              :rules="[{ required: true, message: '请选择题型' }]"
            >
              <template #input>
                <van-radio-group
                  v-model="form.type"
                  direction="horizontal"
                >
                  <van-radio name="choice">
                    选择题
                  </van-radio>
                  <van-radio name="fill">
                    填空题
                  </van-radio>
                  <van-radio name="answer">
                    解答题
                  </van-radio>
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
            <van-button
              round
              block
              type="primary"
              native-type="submit"
              :loading="submitting"
            >
              提交
            </van-button>
          </div>
        </van-form>
      </van-tab>
      
      <van-tab title="拍照识别">
        <div class="photo-section">
          <van-uploader
            v-model="fileList"
            :max-count="1"
            :after-read="afterRead"
            accept="image/*"
            :deletable="true"
          >
            <template #default>
              <div class="upload-content">
                <van-icon
                  name="photograph"
                  size="48"
                />
                <div>点击拍照或上传图片</div>
              </div>
            </template>
          </van-uploader>
          
          <van-button
            v-if="fileList.length > 0"
            type="primary"
            block
            :loading="identifying"
            @click="identifyQuestion"
          >
            AI识别
          </van-button>
          
          <div
            v-if="identifiedQuestion"
            class="identified-result"
          >
            <van-cell-group inset>
              <van-cell
                title="识别结果"
                :value="`${((identifiedQuestion.confidence || 0) * 100).toFixed(0)}%`"
              />
              <van-field
                v-model="identifiedQuestion.title"
                label="标题"
              />
              <van-field
                v-model="identifiedQuestion.content"
                type="textarea"
                rows="2"
                label="内容"
              />
              <van-field
                v-model="identifiedQuestion.answer"
                type="textarea"
                rows="2"
                label="答案"
              />
            </van-cell-group>
            <van-button
              type="primary"
              block
              :loading="submitting"
              @click="saveIdentifiedQuestion"
            >
              保存
            </van-button>
          </div>
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { questionService, type Question } from '@/services/questions'
import { showToast } from 'vant'

const router = useRouter()
const activeTab = ref(0)
const submitting = ref(false)
const identifying = ref(false)
const fileList = ref<any[]>([])
const identifiedQuestion = ref<Question | null>(null)

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

const afterRead = (file: any) => {
  file.status = 'done'
}

const onSubmit = async () => {
  submitting.value = true
  try {
    await questionService.create({
      ...form.value,
      knowledgePoints: knowledgePoints.value,
    })
    showToast('录入成功')
    router.back()
  } catch (error: any) {
    showToast(error.message || '录入失败')
  } finally {
    submitting.value = false
  }
}

const identifyQuestion = async () => {
  if (fileList.value.length === 0) {
    showToast('请先上传图片')
    return
  }
  
  identifying.value = true
  try {
    const result = await questionService.identify(fileList.value[0].file)
    identifiedQuestion.value = result.question
    showToast('识别成功')
  } catch (error: any) {
    showToast(error.message || '识别失败')
  } finally {
    identifying.value = false
  }
}

const saveIdentifiedQuestion = async () => {
  if (!identifiedQuestion.value) return
  
  submitting.value = true
  try {
    await questionService.create({
      title: identifiedQuestion.value.title,
      content: identifiedQuestion.value.content,
      subject: identifiedQuestion.value.subject,
      type: identifiedQuestion.value.type,
      difficulty: identifiedQuestion.value.difficulty,
      knowledgePoints: identifiedQuestion.value.knowledgePoints || [],
      answer: identifiedQuestion.value.answer,
      explanation: identifiedQuestion.value.explanation,
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
}

.identified-result {
  margin-top: 16px;
}
</style>