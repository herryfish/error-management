<template>
  <div class="weakness-profile-page">
    <van-nav-bar
      title="薄弱点画像"
      left-arrow
      @click-left="$router.back()"
    />

    <van-loading v-if="loading" class="loading" />

    <template v-else>
      <!-- 错因占比 -->
      <div class="section-card">
        <div class="section-label">错因占比</div>
        <div class="section-sub">
          已标注错因 {{ profile?.taggedQuestions || 0 }} / {{ profile?.totalQuestions || 0 }} 道错题
        </div>
        <van-empty
          v-if="!profile?.errorTagDistribution?.length"
          description="暂无错因标注，录入或重做时标记错因后展示"
        />
        <div v-else class="bar-list">
          <div
            v-for="slice in profile.errorTagDistribution"
            :key="slice.tag"
            class="bar-row"
          >
            <span class="bar-name">{{ slice.tag }}</span>
            <div class="bar-track">
              <div
                class="bar-fill error"
                :style="{ width: percent(slice.count, totalTagCount) }"
              ></div>
            </div>
            <span class="bar-value">
              {{ slice.count }} 次 · {{ percent(slice.count, totalTagCount) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 薄弱知识点画像 -->
      <div class="section-card">
        <div class="section-label">薄弱知识点</div>
        <div class="section-sub">按累计做错次数排序（仅统计有错误记录的知识点）</div>
        <van-empty
          v-if="!profile?.weakKnowledgePoints?.length"
          description="暂无薄弱知识点，继续加油！"
        />
        <div v-else class="bar-list">
          <div
            v-for="kp in profile.weakKnowledgePoints"
            :key="kp.point"
            class="bar-row"
          >
            <span class="bar-name kp" v-html="renderMath(kp.point)"></span>
            <div class="bar-track">
              <div
                class="bar-fill weak"
                :style="{ width: percent(kp.incorrectCount, maxKpIncorrect) }"
              ></div>
            </div>
            <span class="bar-value">错 {{ kp.incorrectCount }} 次 · {{ kp.questionCount }} 题</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { reportService, type ErrorProfile } from '@/services/reports'
import { renderMath } from '@/utils/math'

const userStore = useUserStore()
const loading = ref(false)
const profile = ref<ErrorProfile | null>(null)

const totalTagCount = computed(() =>
  (profile.value?.errorTagDistribution || []).reduce((sum, s) => sum + s.count, 0)
)

const maxKpIncorrect = computed(() =>
  Math.max(1, ...(profile.value?.weakKnowledgePoints || []).map((k) => k.incorrectCount))
)

const percent = (value: number, total: number) => {
  if (!total) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

onMounted(async () => {
  loading.value = true
  try {
    const studentId = userStore.user?.studentId || userStore.user?.id
    if (studentId) {
      profile.value = await reportService.getErrorProfile(studentId)
    }
  } catch (e) {
    console.error('Failed to load error profile:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.weakness-profile-page {
  padding: 16px 0 80px;
  background-color: #f7f8fa;
  min-height: 100vh;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.section-card {
  margin: 0 16px 16px;
  background: #ffffff;
  border-radius: 8px;
  padding: 14px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-label {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  border-left: 3px solid var(--van-primary-color, #1989fa);
  padding-left: 8px;
}

.section-sub {
  font-size: 12px;
  color: #969799;
  margin: 6px 0 12px 11px;
}

.bar-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-name {
  flex: 0 0 76px;
  font-size: 13px;
  color: #323233;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-name.kp {
  flex: 0 0 84px;
}

.bar-track {
  flex: 1;
  height: 14px;
  background: #f2f3f5;
  border-radius: 7px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 7px;
  transition: width 0.4s ease;
}

.bar-fill.error {
  background: linear-gradient(90deg, #ee0a24, #ff6b6b);
}

.bar-fill.weak {
  background: linear-gradient(90deg, #1989fa, #5a9cf8);
}

.bar-value {
  flex: 0 0 88px;
  font-size: 11px;
  color: #969799;
}
</style>
