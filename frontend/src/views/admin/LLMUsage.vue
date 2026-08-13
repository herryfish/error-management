<template>
  <div class="admin-llm-page">
    <van-nav-bar
      title="LLM用量监控"
      left-arrow
      @click-left="$router.back()"
    />
    
    <div class="stats-panel">
      <!-- 总体统计 -->
      <van-cell-group title="调用概览" inset>
        <van-cell title="总调用次数" :value="stats.totalCalls" />
        <van-cell title="成功次数" :value="stats.successCalls" class="success-text" />
        <van-cell title="失败次数" :value="stats.totalCalls - stats.successCalls" class="fail-text" />
        <van-cell title="总体成功率" :value="`${stats.successRate.toFixed(1)}%`" />
      </van-cell-group>
      
      <!-- 多维统计弹窗入口按键组 -->
      <van-cell-group title="多维统计与日志" inset style="margin-top: 12px;">
        <van-cell title="按用户维度统计 Token 用量" is-link @click="openUserStats" />
        <van-cell title="按日期维度统计 Token 用量" is-link @click="openDateStats" />
        <van-cell title="按场景统计列表" is-link @click="openSceneStats" />
        <van-cell title="按模型统计列表" is-link @click="openModelStats" />
        <van-cell title="最近调用日志明细" is-link @click="openRecentCalls" />
      </van-cell-group>
    </div>

    <!-- 按用户维度统计 Token 弹窗 -->
    <van-popup v-model:show="showUserStats" position="bottom" :style="{ height: '70%' }" round closeable>
      <div style="padding: 16px;">
        <h3>按用户统计 Token 用量</h3>
        <van-cell-group inset style="margin-top: 12px;">
          <van-cell
            v-for="u in userStatsList"
            :key="u.userId || 'system'"
            :title="`${u.username} (${u.role})`"
            :label="`调用 ${u.count} 次 | 输入: ${u.tokensInput} / 输出: ${u.tokensOutput}`"
            :value="`${u.tokensTotal} Tokens`"
          />
        </van-cell-group>
      </div>
    </van-popup>

    <!-- 按日期维度统计 Token 弹窗 -->
    <van-popup v-model:show="showDateStats" position="bottom" :style="{ height: '70%' }" round closeable>
      <div style="padding: 16px;">
        <h3>按日期统计 Token 趋势</h3>
        <van-cell-group inset style="margin-top: 12px;">
          <van-cell
            v-for="d in dateStatsList"
            :key="d.date"
            :title="formatDate(d.date)"
            :label="`当日调用 ${d.count} 次`"
            :value="`${d.tokensTotal} Tokens`"
          />
        </van-cell-group>
      </div>
    </van-popup>

    <!-- 按场景统计弹窗 -->
    <van-popup v-model:show="showSceneStats" position="bottom" :style="{ height: '60%' }" round closeable>
      <div style="padding: 16px;">
        <h3>按场景统计列表</h3>
        <van-cell-group inset style="margin-top: 12px;">
          <van-cell
            v-for="s in sceneStatsList"
            :key="s.scene"
            :title="getSceneName(s.scene)"
            :label="`调用 ${s.count} 次`"
            :value="`${s.totalTokens} Tokens`"
          />
        </van-cell-group>
      </div>
    </van-popup>

    <!-- 按模型统计弹窗 -->
    <van-popup v-model:show="showModelStats" position="bottom" :style="{ height: '60%' }" round closeable>
      <div style="padding: 16px;">
        <h3>按模型统计列表</h3>
        <van-cell-group inset style="margin-top: 12px;">
          <van-cell
            v-for="m in modelStatsList"
            :key="m.model"
            :title="m.model"
            :label="`调用 ${m.count} 次`"
            :value="`${m.totalTokens} Tokens`"
          />
        </van-cell-group>
      </div>
    </van-popup>

    <!-- 最近调用记录弹窗 -->
    <van-popup v-model:show="showRecentCalls" position="bottom" :style="{ height: '80%' }" round closeable>
      <div style="padding: 16px;">
        <h3>最近调用记录</h3>
        <van-list style="margin-top: 12px;">
          <van-cell
            v-for="call in recentCalls"
            :key="call.id"
            :title="getSceneName(call.scene)"
            :label="`${call.model} | 耗时: ${call.latencyMs || 0}ms | ${formatDate(call.createdAt)}`"
            :value="`${call.tokensTotal || 0} Tokens`"
          />
        </van-list>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/utils/api'

const stats = ref({
  totalCalls: 0,
  successCalls: 0,
  successRate: 100,
})

const showUserStats = ref(false)
const userStatsList = ref<any[]>([])

const showDateStats = ref(false)
const dateStatsList = ref<any[]>([])

const showSceneStats = ref(false)
const sceneStatsList = ref<any[]>([])

const showModelStats = ref(false)
const modelStatsList = ref<any[]>([])

const showRecentCalls = ref(false)
const recentCalls = ref<any[]>([])

const loadStats = async () => {
  try {
    const response = await api.get('/llm/usage/summary')
    const resData = response.data?.data || response.data || {}
    stats.value.totalCalls = Number(resData.totalCalls || 0)
    stats.value.successCalls = Number(resData.successfulCalls || 0)
    stats.value.successRate = Number(resData.successRate || 0)
  } catch (error) {
    console.error('Failed to load LLM stats:', error)
  }
}

const openUserStats = async () => {
  showUserStats.value = true
  try {
    const response = await api.get('/llm/usage/by-user')
    userStatsList.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Failed to load user stats:', error)
  }
}

const openDateStats = async () => {
  showDateStats.value = true
  try {
    const response = await api.get('/llm/usage/by-date')
    dateStatsList.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Failed to load date stats:', error)
  }
}

const openSceneStats = async () => {
  showSceneStats.value = true
  try {
    const response = await api.get('/llm/usage/summary')
    const resData = response.data?.data || response.data || {}
    sceneStatsList.value = (resData.sceneSummary || []).map((s: any) => ({
      scene: s.scene,
      count: Number(s.count || 0),
      totalTokens: Number(s.totalTokens || 0)
    }))
  } catch (error) {
    console.error('Failed to load scene stats:', error)
  }
}

const openModelStats = async () => {
  showModelStats.value = true
  try {
    const response = await api.get('/llm/usage/summary')
    const resData = response.data?.data || response.data || {}
    modelStatsList.value = (resData.modelSummary || []).map((m: any) => ({
      model: m.model || 'gpt-4-vision-preview',
      count: Number(m.count || 0),
      totalTokens: Number(m.totalTokens || 0)
    }))
  } catch (error) {
    console.error('Failed to load model stats:', error)
  }
}

const openRecentCalls = async () => {
  showRecentCalls.value = true
  try {
    const response = await api.get('/llm/usage')
    recentCalls.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Failed to load recent calls:', error)
  }
}

const getSceneName = (scene: string) => {
  const scenes: Record<string, string> = {
    recognition: '错题拍照识别',
    grading: '手写/问答判题批改',
    guidance: '解题思路引导',
    similar: '相似题推荐',
    multi_recognition: '整页多题切分识别',
  }
  return scenes[scene] || scene
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
