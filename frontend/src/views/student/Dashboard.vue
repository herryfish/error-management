<!--
  学生端仪表盘组件
  
  功能：
  - 显示今日任务数量
  - 显示掌握进度百分比
  - 显示薄弱知识点数量
  - 快速导航到各功能页面
  
  @author 开发团队
  @date 2026-07-22
  @version 1.0.0
-->
<template>
  <div class="student-dashboard">
    <van-nav-bar
      title="学生端"
      left-arrow
      @click-left="$router.back()"
    >
      <template #right>
        <van-icon
          name="setting-o"
          @click="$router.push('/settings')"
        />
      </template>
    </van-nav-bar>
    
    <van-cell-group inset>
      <!-- 顽固薄弱点置顶：累计做错 ≥ 3 次且未掌握，提示线下定向补课避免机械重试 -->
      <van-cell
        v-if="stats.stubbornQuestions > 0"
        title="⚠️ 顽固薄弱点"
        is-link
        :value="`${stats.stubbornQuestions}个待突破`"
        @click="$router.push('/reports/weakness')"
      >
        <template #label>
          <span style="color: #ee0a24; font-size: 12px;">反复做错，建议对照教材或找老师定向补课</span>
        </template>
        <template #icon>
          <van-icon
            name="warning-o"
            color="#ee0a24"
            style="margin-right: 8px; align-self: center;"
          />
        </template>
      </van-cell>
      <van-cell
        title="今日待复习"
        is-link
        :value="`${stats.todayTasks}道`"
        @click="$router.push('/tasks')"
      >
        <template #icon>
          <van-icon
            name="clock-o"
            :color="stats.todayTasks > 0 ? '#ee0a24' : '#969799'"
            style="margin-right: 8px; align-self: center;"
          />
        </template>
      </van-cell>
      <van-cell
        title="掌握进度"
        is-link
        :value="`${stats.masteryRate}%`"
        @click="$router.push('/mastery')"
      />
      <van-cell
        title="薄弱点画像"
        is-link
        :value="`${stats.weakPoints}个待巩固`"
        @click="$router.push('/reports/weakness')"
      />
    </van-cell-group>

    <van-cell-group
      inset
      style="margin-top: 16px"
    >
      <van-cell
        title="录入错题"
        is-link
        @click="$router.push('/questions/add')"
      />
      <van-cell
        title="错题本"
        is-link
        @click="$router.push('/questions')"
      />
      <van-cell
        title="今日重做"
        is-link
        @click="$router.push('/redo')"
      />
      <van-cell
        title="相似题练习"
        is-link
        @click="$router.push('/similar')"
      />
    </van-cell-group>
    
    <van-cell-group
      inset
      style="margin-top: 16px"
    >
      <van-cell
        title="周报"
        is-link
        @click="$router.push('/reports/weekly')"
      />
      <van-cell
        title="统计信息"
        is-link
        @click="$router.push('/reports/stats')"
      />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { masteryService } from '@/services/mastery'

const userStore = useUserStore()

const stats = ref({
  todayTasks: 0,
  masteryRate: 0,
  weakPoints: 0,
  stubbornQuestions: 0,
})

const loadDashboardStats = async () => {
  const studentId = userStore.user?.studentId || userStore.user?.id
  if (studentId) {
    try {
      const masteryStats = await masteryService.getStats(studentId)
      stats.value = {
        todayTasks: masteryStats.todayDueQuestions ?? (masteryStats.newQuestions + masteryStats.learningQuestions),
        masteryRate: masteryStats.masteryRate,
        weakPoints: masteryStats.learningQuestions,
        stubbornQuestions: masteryStats.stubbornQuestions ?? 0,
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }
}

watch(() => userStore.user, () => {
  loadDashboardStats()
}, { immediate: true })

onMounted(async () => {
  await loadDashboardStats()
})
</script>

<style scoped>
.student-dashboard {
  padding: 16px;
  padding-bottom: 80px;
}
</style>
