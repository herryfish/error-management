<template>
  <div class="admin-llm-page">
    <van-nav-bar
      title="LLM 用量监控"
      left-arrow
      @click-left="$router.back()"
    />
    
    <van-cell-group inset style="margin-top: 16px;">
      <van-cell
        title="总调用次数"
        :value="`${stats.totalCalls} 次`"
      />
      <van-cell
        title="成功次数"
        :value="`${stats.successfulCalls} 次`"
      />
      <van-cell
        title="失败次数"
        :value="`${stats.failedCalls} 次`"
      />
      <van-cell
        title="总体成功率"
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
        value="查看场景分布"
        @click="showSceneStats = true"
      />
      <van-cell
        title="按模型统计"
        is-link
        value="查看模型分布"
        @click="showModelStats = true"
      />
      <van-cell
        title="最近调用记录"
        is-link
        value="查看最近 100 条"
        @click="openRecentCalls"
      />
    </van-cell-group>

    <!-- 按场景统计弹窗 -->
    <van-popup
      v-model:show="showSceneStats"
      position="bottom"
      round
      :style="{ height: '70%' }"
    >
      <div class="stats-panel">
        <van-nav-bar
          title="按场景统计"
          left-text="关闭"
          @click-left="showSceneStats = false"
        />
        <van-cell-group v-if="stats.sceneSummary && stats.sceneSummary.length > 0">
          <van-cell
            v-for="item in stats.sceneSummary"
            :key="item.scene"
            :title="getSceneText(item.scene)"
            :label="`Token: ${item.totalTokens || 0} | 成本: $${Number(item.totalCost || 0).toFixed(4)}`"
            :value="`${item.count} 次`"
          />
        </van-cell-group>
        <van-empty v-else description="暂无场景统计数据" />
      </div>
    </van-popup>

    <!-- 按模型统计弹窗 -->
    <van-popup
      v-model:show="showModelStats"
      position="bottom"
      round
      :style="{ height: '70%' }"
    >
      <div class="stats-panel">
        <van-nav-bar
          title="按模型统计"
          left-text="关闭"
          @click-left="showModelStats = false"
        />
        <van-cell-group v-if="stats.modelSummary && stats.modelSummary.length > 0">
          <van-cell
            v-for="item in stats.modelSummary"
            :key="item.model + (item.provider || '')"
            :title="`${item.provider || 'default'} / ${item.model}`"
            :label="`降级模式: ${item.isFallback ? '是' : '否'} | Token: ${item.totalTokens || 0}`"
            :value="`${item.count} 次`"
          />
        </van-cell-group>
        <van-empty v-else description="暂无模型统计数据" />
      </div>
    </van-popup>

    <!-- 最近调用记录弹窗 -->
    <van-popup
      v-model:show="showRecentCalls"
      position="bottom"
      round
      :style="{ height: '80%' }"
    >
      <div class="stats-panel">
        <van-nav-bar
          title="最近调用记录"
          left-text="关闭"
          @click-left="showRecentCalls = false"
        />
        <van-list v-if="recentCalls && recentCalls.length > 0">
          <van-cell
            v-for="log in recentCalls"
            :key="log.id"
            :title="`[${getSceneText(log.scene)}] ${log.model}`"
            :label="`耗时: ${log.latencyMs}ms | Token: ${log.tokensTotal || 0} | 时间: ${formatDate(log.createdAt)}`"
            :value="log.success ? '成功' : '失败'"
            :value-class="log.success ? 'success-text' : 'fail-text'"
          />
        </van-list>
        <van-empty v-else description="暂无调用记录" />
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

const recentCalls = ref<any[]>([])

const showSceneStats = ref(false)
const showModelStats = ref(false)
const showRecentCalls = ref(false)

const loadStats = async () => {
  try {
    const response = await api.get('/llm/usage/summary')
    if (response.data) {
      stats.value = response.data
    }
  } catch (error) {
    console.error('Failed to load LLM stats:', error)
  }
}

const openRecentCalls = async () => {
  showRecentCalls.value = true
  try {
    const response = await api.get('/llm/usage')
    recentCalls.value = response.data || []
  } catch (error) {
    console.error('Failed to load recent LLM calls:', error)
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

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.admin-llm-page {
  padding-bottom: 30px;
}

.stats-panel {
  padding: 12px;
}

.success-text {
  color: #07c160;
}

.fail-text {
  color: #ee0a24;
}
</style>
