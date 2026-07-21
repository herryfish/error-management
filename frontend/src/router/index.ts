import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
  },
  // Student routes
  {
    path: '/student',
    name: 'StudentDashboard',
    component: () => import('@/views/student/Dashboard.vue'),
    meta: { requiresAuth: true, role: 'student' },
  },
  {
    path: '/questions',
    name: 'Questions',
    component: () => import('@/views/student/Questions.vue'),
    meta: { requiresAuth: true, role: 'student' },
  },
  {
    path: '/questions/add',
    name: 'AddQuestion',
    component: () => import('@/views/student/AddQuestion.vue'),
    meta: { requiresAuth: true, role: 'student' },
  },
  {
    path: '/questions/:id',
    name: 'QuestionDetail',
    component: () => import('@/views/student/QuestionDetail.vue'),
    meta: { requiresAuth: true, role: 'student' },
  },
  {
    path: '/redo/add/:questionId',
    name: 'AddRedo',
    component: () => import('@/views/student/Redo.vue'),
    meta: { requiresAuth: true, role: 'student' },
  },
  {
    path: '/similar/:questionId',
    name: 'SimilarQuestions',
    component: () => import('@/views/student/SimilarQuestions.vue'),
    meta: { requiresAuth: true, role: 'student' },
  },
  // Parent routes
  {
    path: '/parent',
    name: 'ParentDashboard',
    component: () => import('@/views/parent/Dashboard.vue'),
    meta: { requiresAuth: true, role: 'parent' },
  },
  {
    path: '/parent/questions',
    name: 'ParentQuestions',
    component: () => import('@/views/parent/Questions.vue'),
    meta: { requiresAuth: true, role: 'parent' },
  },
  // Admin routes
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: () => import('@/views/admin/Dashboard.vue'),
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('@/views/admin/Users.vue'),
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/llm',
    name: 'AdminLLM',
    component: () => import('@/views/admin/LLMUsage.vue'),
    meta: { requiresAuth: true, role: 'admin' },
  },
  // Common routes
  {
    path: '/reports/weekly',
    name: 'WeeklyReport',
    component: () => import('@/views/common/WeeklyReport.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/reports/stats',
    name: 'Stats',
    component: () => import('@/views/common/Stats.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/common/Settings.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard
router.beforeEach((to, _from, next) => {
  const isAuthenticated = localStorage.getItem('token')
  const userRole = localStorage.getItem('userRole')

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.meta.role && to.meta.role !== userRole) {
    next('/')
  } else {
    next()
  }
})

export default router