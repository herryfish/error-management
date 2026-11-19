import { Router } from 'express'
import { MasteryController } from '../controllers/MasteryController'
import { authenticate } from '../middleware/auth'

const router = Router()
const masteryController = new MasteryController()

// Protected routes
router.use(authenticate)

// Student-specific routes (must be before /:id to avoid conflicts)
router.get('/student/:studentId', masteryController.getMasteryByStudent)
router.get('/student/:studentId/queue', masteryController.getReviewQueue)
router.get('/student/:studentId/stats', masteryController.getMasteryStats)
// 顽固薄弱点列表（学生首页置顶 / 家长周报提示）
router.get('/student/:studentId/stubborn', masteryController.getStubbornQuestions)

// Question-specific routes
router.get('/question/:questionId', masteryController.getMasteryByQuestion)

// General routes
router.get('/', masteryController.getAllMastery)
router.get('/:id', masteryController.getMasteryById)
router.post('/', masteryController.createMastery)
router.put('/:id', masteryController.updateMastery)
router.put('/:id/review', masteryController.reviewMastery)

export default router