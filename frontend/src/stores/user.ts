import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { authService } from '@/services/auth'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role)

  const setUser = (newUser: User) => {
    user.value = newUser as User
    localStorage.setItem('userRole', newUser.role)
  }

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const login = async (username: string, password: string) => {
    loading.value = true
    try {
      const response = await authService.login({ username, password })
      setToken(response.data.token)
      setUser(response.data.user as User)
      return response.data
    } finally {
      loading.value = false
    }
  }

  const register = async (data: any) => {
    loading.value = true
    try {
      const response = await authService.register(data)
      setToken(response.data.token)
      setUser(response.data.user as User)
      return response.data
    } finally {
      loading.value = false
    }
  }

  const fetchUser = async () => {
    if (!token.value) return
    loading.value = true
    try {
      const response = await authService.getMe()
      setUser(response.data)
    } catch (error) {
      logout()
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
  }

  return {
    user,
    token,
    loading,
    isLoggedIn,
    userRole,
    setUser,
    setToken,
    login,
    register,
    fetchUser,
    logout,
  }
})