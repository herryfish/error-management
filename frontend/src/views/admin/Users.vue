<template>
  <div class="admin-users-page">
    <van-nav-bar
      title="用户管理"
      left-arrow
      @click-left="$router.back()"
    />
    
    <van-search
      v-model="searchKeyword"
      placeholder="搜索用户名/角色"
    />
    
    <van-list
      v-model:loading="loading"
      :finished="finished"
      @load="loadUsers"
    >
      <van-cell
        v-for="user in filteredUsers"
        :key="user.id"
        :title="user.username"
        :label="getRoleText(user.role)"
        is-link
        @click="openResetPwd(user)"
      >
        <template #right-icon>
          <div style="display: flex; align-items: center; gap: 8px;">
            <van-tag :type="getRoleType(user.role)">
              {{ getRoleText(user.role) }}
            </van-tag>
            <van-button size="mini" type="primary" plain @click.stop="openResetPwd(user)">
              修改密码
            </van-button>
          </div>
        </template>
      </van-cell>
    </van-list>
    
    <van-empty
      v-if="!loading && filteredUsers.length === 0"
      description="暂无符合条件的用户"
    />

    <!-- 重置/修改密码弹窗 -->
    <van-dialog
      v-model:show="showPasswordDialog"
      title="修改用户密码"
      show-cancel-button
      :before-close="handlePasswordSubmit"
    >
      <van-cell-group inset style="margin-top: 12px;">
        <van-field
          label="用户名"
          :model-value="selectedUser?.username"
          readonly
        />
        <van-field
          v-model="newPassword"
          type="password"
          label="新密码"
          placeholder="请输入至少6位新密码"
          :rules="[{ required: true, message: '请填写新密码' }]"
        />
      </van-cell-group>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { showToast, showSuccessToast, showFailToast } from 'vant'
import api from '@/utils/api'

const loading = ref(false)
const finished = ref(false)
const users = ref<any[]>([])
const searchKeyword = ref('')

const showPasswordDialog = ref(false)
const selectedUser = ref<any>(null)
const newPassword = ref('')

const filteredUsers = computed(() => {
  if (!searchKeyword.value.trim()) return users.value
  const kw = searchKeyword.value.toLowerCase()
  return users.value.filter(
    (u) =>
      u.username.toLowerCase().includes(kw) ||
      getRoleText(u.role).toLowerCase().includes(kw)
  )
})

const loadUsers = async () => {
  try {
    const response = await api.get('/admin/users')
    users.value = response.data?.data || response.data || []
    finished.value = true
  } catch (error) {
    console.error('Failed to load users:', error)
  } finally {
    loading.value = false
  }
}

const openResetPwd = (user: any) => {
  selectedUser.value = user
  newPassword.value = ''
  showPasswordDialog.value = true
}

const handlePasswordSubmit = async (action: string) => {
  if (action === 'cancel') {
    return true
  }

  if (!newPassword.value || newPassword.value.length < 6) {
    showToast('新密码长度不能少于6位')
    return false
  }

  try {
    await api.put(`/admin/users/${selectedUser.value.id}/password`, {
      password: newPassword.value,
    })
    showSuccessToast('密码修改成功')
    return true
  } catch (error: any) {
    showFailToast(error.response?.data?.message || '密码修改失败')
    return false
  }
}

const getRoleType = (role: string): 'primary' | 'success' | 'warning' | 'default' => {
  const types: Record<string, 'primary' | 'success' | 'warning' | 'default'> = {
    student: 'primary',
    parent: 'success',
    admin: 'warning',
  }
  return types[role] || 'default'
}

const getRoleText = (role: string) => {
  const texts: Record<string, string> = {
    student: '学生',
    parent: '家长',
    admin: '管理员',
  }
  return texts[role] || role
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.admin-users-page {
  padding-bottom: 80px;
}
</style>
