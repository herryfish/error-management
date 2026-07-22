<template>
  <div class="admin-llm-page">
    <van-nav-bar
      title="LLM用量"
      left-arrow
      @click-left="$router.back()"
    />
    
    <van-cell-group inset>
      <van-cell
        title="总调用次数"
        :value="stats.totalCalls"
      />
      <van-cell
        title="成功次数"
        :value="stats.successfulCalls"
      />
      <van-cell
        title="失败次数"
        :value="stats.failedCalls"
      />
      <van-cell
        title="成功率"
        :value="`${stats.successRate}%`"
      />
    </van-cell-group>
    
    <van-cell-group
      inset
      style="margin-top: 16px"
    >
      <van-cell
        title="按场景统计"
        is-link
        @click="showSceneStats = true"
      />
      <van-cell
        title="按模型统计"
        is-link
        @click="showModelStats = true"
      />
    </van-cell-group>
    
    <van-cell-group
      inset
      style="margin-top: 16px"
    >
      <van-cell
        title="最近调用记录"
        is-link
        @click="showRecentCalls = true"
      />
    </van-cell-group>
    
    <van-popup
      v-model:show="showSceneStats"
      position="bottom"
      :style="{ height: '60%' }"
    >
      <div class="stats-panel">
        <van-nav-bar
          title="按场景统计"
          left-text="关闭"
          @click-left="showSceneStats = false"
        />
        <van-cell-group>
          <van-cell
            v-for="item in stats.sceneSummary"
            :key="item.scene"
            :title="getSceneText(item.scene)"
            :value="`${item.count}次`"
          />
        </van-cell-group>
      </div>
    </van-popup>
    
    <van-popup
      v-model:show="showModelStats"
      position="bottom"
      :style="{ height: '60%' }"
    >
      <div class="stats-panel">
        <van-nav-bar
          title="按模型统计"
          left-text="关闭"
          @click-left="showModelStats = false"
        />
        <van-cell-group>
          <van-cell
            v-for="item in stats.modelSummary"
            :key="item.model"
            :title="`${item.provider}/${item.model}`"
            :value="`${item.count}次`"
          />
        </van-cell-group>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/utils/api'

const stats = ref({
  totalCalls: 0,
  successfulCalls: 0,
  failedCalls: 0,
  successRate: 0,
  sceneSummary: [] as any[],
  modelSummary: [] as any[],
})

const showSceneStats = ref(false)
const showModelStats = ref(false)
const showRecentCalls = ref(false)

const loadStats = async () => {
  try {
    const response = await api.get('/llm/usage/summary')
    stats.value = response.data
  } catch (error) {
    console.error('Failed to load LLM stats:', error)
  }
}

const getSceneText = (scene: string) => {
  const texts: Record<string, string> = {
    recognition: '错题识别',
    grading: '手写批改',
    guidance: '引导问答',
    similar: '相似题生成',
    other: '其他',
  }
  return texts[scene] || scene
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.admin-llm-page {
  padding-bottom: 80px;
}

.stats-panel {
  padding: 16px;
}
</style>