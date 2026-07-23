<template>
  <div class="login">
    <h1>登录</h1>
    <van-form @submit="onSubmit">
      <van-cell-group inset>
        <van-field
          v-model="form.username"
          name="username"
          label="用户名"
          placeholder="用户名"
          :rules="[{ required: true, message: '请填写用户名' }]"
        />
        <van-field
          v-model="form.password"
          type="password"
          name="password"
          label="密码"
          placeholder="密码"
          :rules="[{ required: true, message: '请填写密码' }]"
        />
      </van-cell-group>
      <div style="margin: 16px">
        <van-button
          round
          block
          type="primary"
          native-type="submit"
        >
          登录
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { showToast } from 'vant'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  username: '',
  password: '',
})

const onSubmit = async (values: any) => {
  try {
    const res = await userStore.login(values.username, values.password)
    const role = res.user?.role || localStorage.getItem('userRole') || 'student'
    if (role === 'parent') {
      router.push('/parent')
    } else if (role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/student')
    }
  } catch (error: any) {
    showToast(error.message || '登录失败，请检查用户名和密码')
  }
}
</script>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
}

h1 {
  margin-bottom: 30px;
  color: #333;
}
</style>