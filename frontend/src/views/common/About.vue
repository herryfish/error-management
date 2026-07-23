<template>
  <div>
    <van-nav-bar title="关于我们" left-arrow @click-left="$router.back()" />
    <van-cell-group inset style="margin-top: 16px">
      <van-cell title="应用名称" value="错题管理系统" />
      <van-cell title="版本号" value="v1.0.0" />
      <van-cell title="功能介绍">
        <template #label>
          <div style="line-height: 1.8;">
            智能错题管理，帮助学生高效复习。<br>
            - 拍照/手动录入错题<br>
            - AI 智能识别题目<br>
            - 掌握状态跟踪<br>
            - 相似题推荐练习<br>
            - 家长端透明监控<br>
            - 学习周报统计
          </div>
        </template>
      </van-cell>
      <van-cell title="技术支持" value="开发团队" />
    </van-cell-group>
  </div>
</template>
