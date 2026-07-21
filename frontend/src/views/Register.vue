<template>
  <div class="register-page">
    <van-nav-bar title="注册" left-arrow @click-left="$router.back()" />
    
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
        <van-field
          v-model="form.name"
          name="name"
          label="姓名"
          placeholder="姓名"
          :rules="[{ required: true, message: '请填写姓名' }]"
        />
        <van-field name="role" label="角色">
          <template #input>
            <van-radio-group v-model="form.role" direction="horizontal">
              <van-radio name="student">学生</van-radio>
              <van-radio name="parent">家长</van-radio>
            </van-radio-group>
          </template>
        </van-field>
        <van-field v-if="form.role === 'student'" v-model="form.grade" name="grade" label="年级" placeholder="年级" />
        <van-field v-if="form.role === 'student'" v-model="form.school" name="school" label="学校" placeholder="学校" />
        <van-field v-if="form.role === 'parent'" v-model="form.phone" name="phone" label="手机号" placeholder="手机号" />
        <van-field v-if="form.role === 'parent'" v-model="form.email" name="email" label="邮箱" placeholder="邮箱" />
      </van-cell-group>
      <div style="margin: 16px">
        <van-button round block type="primary" native-type="submit" :loading="loading">
          注册
        </van-button>
      </div>
    </van-form>
    
    <div class="login-link">
      已有账号？<a @click="$router.push('/login')">立即登录</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { showToast } from 'vant'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

const form = ref({
  username: '',
  password: '',
  name: '',
  role: 'student' as 'student' | 'parent',
  grade: '',
  school: '',
  phone: '',
  email: '',
})

const onSubmit = async () => {
  loading.value = true
  try {
    await userStore.register(form.value)
    showToast('注册成功')
    router.push(`/${form.value.role}`)
  } catch (error: any) {
    showToast(error.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  padding: 16px;
}

.login-link {
  text-align: center;
  margin-top: 16px;
  color: #666;
}

.login-link a {
  color: #1989fa;
}
</style>