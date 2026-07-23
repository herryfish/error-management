<template>
  <div>
    <van-nav-bar title="通知设置" left-arrow @click-left="$router.back()" />
    <van-cell-group inset style="margin-top: 16px" title="通知类型">
      <van-cell title="周报通知" label="每周一推送学习周报">
        <template #right-icon>
          <van-switch v-model="settings.weeklyReport" size="24" />
        </template>
      </van-cell>
      <van-cell title="相似题提醒" label="连续错2次自动推荐相似题">
        <template #right-icon>
          <van-switch v-model="settings.similarQuestion" size="24" />
        </template>
      </van-cell>
      <van-cell title="复习提醒" label="今日需复习题目提醒">
        <template #right-icon>
          <van-switch v-model="settings.reviewReminder" size="24" />
        </template>
      </van-cell>
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const settings = ref({
  weeklyReport: true,
  similarQuestion: true,
  reviewReminder: true,
})
</script>
