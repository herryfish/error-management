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

      <van-cell-group inset title="LLM 默认模型设置" style="margin-top: 16px;">
        <van-field v-model="form.llm_model_recognize" label="错题识别模型" placeholder="例如 gpt-4o" />
        <van-field v-model="form.llm_model_grading" label="手写批改模型" placeholder="例如 gpt-4o" />
        <van-field v-model="form.llm_model_similar" label="相似题生成模型" placeholder="例如 gpt-4o" />
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
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import api from '@/utils/api'

const saving = ref(false)
const form = ref({
  show_solution_directly: true,
  daily_target_default: '5',
  max_upload_size_mb: '10',
  llm_model_recognize: 'gpt-4o',
  llm_model_grading: 'gpt-4o',
  llm_model_similar: 'gpt-4o',
})

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
      { key: 'llm_model_grading', value: form.value.llm_model_grading, category: 'llm' },
      { key: 'llm_model_similar', value: form.value.llm_model_similar, category: 'llm' },
    ]

    for (const item of entries) {
      await api.put('/admin/config', item)
    }

    showToast('系统配置修改保存成功')
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
