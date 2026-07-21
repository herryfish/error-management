import api from '@/utils/api'

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  role: 'student' | 'parent' | 'admin'
  name?: string
  grade?: string
  school?: string
  phone?: string
  email?: string
}

export interface AuthResponse {
  status: string
  data: {
    user: {
      id: string
      username: string
      role: string
    }
    token: string
  }
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    return api.post('/auth/login', data)
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return api.post('/auth/register', data)
  },

  async getMe() {
    return api.get('/auth/me')
  },

  async logout() {
    return api.post('/auth/logout')
  },

  async bindParentStudent(studentId: string) {
    return api.post('/auth/bind', { studentId })
  },

  async unlinkParentStudent() {
    return api.post('/auth/unlink')
  },
}