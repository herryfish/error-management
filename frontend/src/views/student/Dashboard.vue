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
      <van-cell
        title="今日任务"
        is-link
        :value="`${stats.todayTasks}道`"
        @click="$router.push('/tasks')"
      />
      <van-cell
        title="掌握进度"
        is-link
        :value="`${stats.masteryRate}%`"
        @click="$router.push('/mastery')"
      />
      <van-cell
        title="薄弱知识点"
        is-link
        :value="`${stats.weakPoints}个`"
        @click="$router.push('/weak-points')"
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
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { masteryService } from '@/services/mastery'

const userStore = useUserStore()

const stats = ref({
  todayTasks: 0,
  masteryRate: 0,
  weakPoints: 0,
})

onMounted(async () => {
  if (userStore.user?.studentId) {
    try {
      const masteryStats = await masteryService.getStats(userStore.user.studentId)
      stats.value = {
        todayTasks: masteryStats.newQuestions + masteryStats.learningQuestions,
        masteryRate: masteryStats.masteryRate,
        weakPoints: masteryStats.learningQuestions,
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }
})
</script>

<style scoped>
.student-dashboard {
  padding: 16px;
  padding-bottom: 80px;
}
</style>