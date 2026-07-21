export interface User {
  id: string
  username: string
  role: 'student' | 'parent' | 'admin'
  studentId?: string
  parentId?: string
}

export interface Question {
  id: string
  title: string
  content: string
  subject: 'math' | 'physics' | 'chemistry'
  type: 'choice' | 'fill' | 'answer'
  difficulty: number
  knowledgePoints: string[]
  imageUrl?: string
  originalImageUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface RedoRecord {
  id: string
  questionId: string
  userId: string
  type: 'online' | 'photo'
  answer: string
  isCorrect: boolean
  gradeResult?: GradeResult
  createdAt: Date
}

export interface GradeResult {
  score: number
  isCorrect: boolean
  feedback: string
  modelUsed: string
}

export interface Mastery {
  id: string
  questionId: string
  userId: string
  status: 'new' | 'learning' | 'mastered'
  correctCount: number
  lastCorrectDate?: Date
  nextReviewDate?: Date
  intervalLevel: number
}

export interface SimilarQuestion {
  id: string
  originalQuestionId: string
  content: string
  isApplicable: boolean
  generatedAt: Date
}

export interface LLMUsage {
  id: string
  userId: string
  scene: 'recognition' | 'grading' | 'guidance' | 'similar' | 'other'
  provider: string
  model: string
  isFallback: boolean
  tokens: {
    input: number
    output: number
    total: number
  }
  cost: number
  latencyMs: number
  success: boolean
  error?: string
  businessId?: string
  createdAt: Date
}

export interface Notification {
  id: string
  userId: string
  type: 'weekly_report' | 'similar_question' | 'system'
  title: string
  content: string
  isRead: boolean
  createdAt: Date
}

export interface WeeklyReport {
  id: string
  userId: string
  weekStart: Date
  weekEnd: Date
  weakPoints: string[]
  totalQuestions: number
  masteredQuestions: number
  similarQuestionsGenerated: number
  createdAt: Date
}