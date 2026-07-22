<template>
  <div class="home">
    <h1>错题管理系统</h1>
    <p>欢迎使用错题管理系统</p>
    <div class="buttons">
      <van-button
        type="primary"
        block
        @click="$router.push('/login')"
      >
        登录
      </van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Home component
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
}

h1 {
  margin-bottom: 10px;
  color: #333;
}

p {
  margin-bottom: 30px;
  color: #666;
}

.buttons {
  width: 100%;
  max-width: 300px;
}
</style>