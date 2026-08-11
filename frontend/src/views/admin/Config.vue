<template>
  <div class="admin-config">
    <van-nav-bar
      title="系统配置管理"
      left-arrow
      @click-left="$router.back()"
    />

    <van-form @submit="saveConfig" style="margin-top: 16px;">
      <van-cell-group inset title="业务参数规则">
        <van-cell title="直接显示解析">
          <template #right-icon>
            <van-switch v-model="form.show_solution_directly" size="20" />
          </template>
        </van-cell>

        <van-field
          v-model="form.daily_target_default"
          type="digit"
          label="每日目标题数"
          placeholder="请输入默认每日复习题数"
        />

        <van-field
          v-model="form.max_upload_size_mb"
          type="digit"
          label="最大上传(MB)"
          placeholder="单张图片最大体积"
        />
      </van-cell-group>

      <van-cell-group inset title="LLM 场景模型绑定（主模型 / 降级模型）" style="margin-top: 16px;">
        <!-- 错题识别：限制为视觉能力模型 -->
        <van-field
          v-model="form.llm_model_recognize"
          is-link
          readonly
          name="picker_recognize"
          label="错题识别主模型"
          placeholder="选择识别主模型"
          @click="showPickerRecognize = true"
        />
        <van-popup v-model:show="showPickerRecognize" position="bottom" round>
          <van-picker
            :columns="visionModelColumns"
            @confirm="onConfirmRecognize"
            @cancel="showPickerRecognize = false"
          />
        </van-popup>

        <van-field
          v-model="form.llm_model_recognize_fallback"
          is-link
          readonly
          name="picker_recognize_fb"
          label="错题识别降级模型"
          placeholder="选择识别降级模型"
          @click="showPickerRecognizeFb = true"
        />
        <van-popup v-model:show="showPickerRecognizeFb" position="bottom" round>
          <van-picker
            :columns="visionModelColumns"
            @confirm="onConfirmRecognizeFb"
            @cancel="showPickerRecognizeFb = false"
          />
        </van-popup>

        <!-- 智能批改：全量模型白名单 -->
        <van-field
          v-model="form.llm_model_grading"
          is-link
          readonly
          name="picker_grading"
          label="智能批改正主模型"
          placeholder="选择批改主模型"
          @click="showPickerGrading = true"
        />
        <van-popup v-model:show="showPickerGrading" position="bottom" round>
          <van-picker
            :columns="allModelColumns"
            @confirm="onConfirmGrading"
            @cancel="showPickerGrading = false"
          />
        </van-popup>

        <van-field
          v-model="form.llm_model_grading_fallback"
          is-link
          readonly
          name="picker_grading_fb"
          label="智能批改降级模型"
          placeholder="选择批改降级模型"
          @click="showPickerGradingFb = true"
        />
        <van-popup v-model:show="showPickerGradingFb" position="bottom" round>
          <van-picker
            :columns="allModelColumns"
            @confirm="onConfirmGradingFb"
            @cancel="showPickerGradingFb = false"
          />
        </van-popup>

        <!-- 相似题推荐：全量模型白名单 -->
        <van-field
          v-model="form.llm_model_similar"
          is-link
          readonly
          name="picker_similar"
          label="相似题推荐主模型"
          placeholder="选择推荐主模型"
          @click="showPickerSimilar = true"
        />
        <van-popup v-model:show="showPickerSimilar" position="bottom" round>
          <van-picker
            :columns="allModelColumns"
            @confirm="onConfirmSimilar"
            @cancel="showPickerSimilar = false"
          />
        </van-popup>

        <van-field
          v-model="form.llm_model_similar_fallback"
          is-link
          readonly
          name="picker_similar_fb"
          label="相似题推荐降级模型"
          placeholder="选择推荐降级模型"
          @click="showPickerSimilarFb = true"
        />
        <van-popup v-model:show="showPickerSimilarFb" position="bottom" round>
          <van-picker
            :columns="allModelColumns"
            @confirm="onConfirmSimilarFb"
            @cancel="showPickerSimilarFb = false"
          />
        </van-popup>
      </van-cell-group>

      <div style="margin: 24px 16px;">
        <van-button round block type="primary" native-type="submit" :loading="saving">
          保存修改
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { showToast } from 'vant'
import api from '@/utils/api'

const saving = ref(false)

// 视觉模型白名单（只能用于识题场景）
const VISION_MODELS = [
  { text: 'gpt-4o (OpenAI 旗舰视觉)', value: 'gpt-4o' },
  { text: 'gpt-4-vision-preview (OpenAI 视觉预检)', value: 'gpt-4-vision-preview' },
  { text: 'claude-3-5-sonnet-20240620 (Anthropic 旗舰)', value: 'claude-3-5-sonnet-20240620' },
  { text: 'sensenova-6.7-flash-lite (商汤 识题模型)', value: 'sensenova-6.7-flash-lite' },
]

// 纯文本与高推理模型白名单
const TEXT_MODELS = [
  { text: 'deepseek-r1 (DeepSeek 深度推理)', value: 'deepseek-r1' },
  { text: 'deepseek-chat (DeepSeek 通用)', value: 'deepseek-chat' },
  { text: 'gpt-4o-mini (OpenAI 轻量模型)', value: 'gpt-4o-mini' },
  { text: 'gpt-3.5-turbo (OpenAI 基础模型)', value: 'gpt-3.5-turbo' },
  { text: 'claude-3-haiku-20240307 (Anthropic 极速)', value: 'claude-3-haiku-20240307' },
]

// 全量可用模型白名单
const ALL_MODELS = [...VISION_MODELS, ...TEXT_MODELS]

const form = ref({
  show_solution_directly: true,
  daily_target_default: '5',
  max_upload_size_mb: '10',
  llm_model_recognize: 'gpt-4o',
  llm_model_recognize_fallback: 'sensenova-6.7-flash-lite',
  llm_model_grading: 'gpt-4o',
  llm_model_grading_fallback: 'deepseek-r1',
  llm_model_similar: 'gpt-4o',
  llm_model_similar_fallback: 'deepseek-chat',
})

// 弹出 Picker 状态
const showPickerRecognize = ref(false)
const showPickerRecognizeFb = ref(false)
const showPickerGrading = ref(false)
const showPickerGradingFb = ref(false)
const showPickerSimilar = ref(false)
const showPickerSimilarFb = ref(false)

// 构建带容错标记的 Column 选项
const buildColumns = (whiteList: Array<{ text: string; value: string }>, currentValue: string) => {
  const exists = whiteList.some(m => m.value === currentValue)
  if (!exists && currentValue) {
    return [
      { text: `⚠️ ${currentValue} (已下线/历史模型)`, value: currentValue },
      ...whiteList
    ]
  }
  return whiteList
}

const visionModelColumns = computed(() => buildColumns(VISION_MODELS, form.value.llm_model_recognize))
const allModelColumns = computed(() => buildColumns(ALL_MODELS, form.value.llm_model_grading))

const onConfirmRecognize = ({ selectedOptions }: any) => {
  form.value.llm_model_recognize = selectedOptions[0]?.value || ''
  showPickerRecognize.value = false
}

const onConfirmRecognizeFb = ({ selectedOptions }: any) => {
  form.value.llm_model_recognize_fallback = selectedOptions[0]?.value || ''
  showPickerRecognizeFb.value = false
}

const onConfirmGrading = ({ selectedOptions }: any) => {
  form.value.llm_model_grading = selectedOptions[0]?.value || ''
  showPickerGrading.value = false
}

const onConfirmGradingFb = ({ selectedOptions }: any) => {
  form.value.llm_model_grading_fallback = selectedOptions[0]?.value || ''
  showPickerGradingFb.value = false
}

const onConfirmSimilar = ({ selectedOptions }: any) => {
  form.value.llm_model_similar = selectedOptions[0]?.value || ''
  showPickerSimilar.value = false
}

const onConfirmSimilarFb = ({ selectedOptions }: any) => {
  form.value.llm_model_similar_fallback = selectedOptions[0]?.value || ''
  showPickerSimilarFb.value = false
}

const loadConfig = async () => {
  try {
    const res = await api.get('/admin/config')
    const configs: Array<{ key: string; value: string }> = res.data || []
    configs.forEach(cfg => {
      if (cfg.key === 'show_solution_directly') {
        form.value.show_solution_directly = cfg.value === 'true'
      } else if (cfg.key in form.value) {
        (form.value as any)[cfg.key] = cfg.value
      }
    })
  } catch (error) {
    console.error('Failed to load config:', error)
  }
}

const saveConfig = async () => {
  saving.value = true
  try {
    const entries = [
      { key: 'show_solution_directly', value: String(form.value.show_solution_directly), category: 'business' },
      { key: 'daily_target_default', value: String(form.value.daily_target_default), category: 'business' },
      { key: 'max_upload_size_mb', value: String(form.value.max_upload_size_mb), category: 'system' },
      { key: 'llm_model_recognize', value: form.value.llm_model_recognize, category: 'llm' },
      { key: 'llm_model_recognize_fallback', value: form.value.llm_model_recognize_fallback, category: 'llm' },
      { key: 'llm_model_grading', value: form.value.llm_model_grading, category: 'llm' },
      { key: 'llm_model_grading_fallback', value: form.value.llm_model_grading_fallback, category: 'llm' },
      { key: 'llm_model_similar', value: form.value.llm_model_similar, category: 'llm' },
      { key: 'llm_model_similar_fallback', value: form.value.llm_model_similar_fallback, category: 'llm' },
    ]

    for (const item of entries) {
      await api.put('/admin/config', item)
    }

    showToast('系统模型与配置修改保存成功')
  } catch (error: any) {
    showToast(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.admin-config {
  padding-bottom: 30px;
}
</style>
