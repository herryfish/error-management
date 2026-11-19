import { Router } from 'express'
import { ReportController } from '../controllers/ReportController'
import { authenticate } from '../middleware/auth'

const router = Router()
const reportController = new ReportController()

// Protected routes
router.use(authenticate)

router.get('/weekly', reportController.getWeeklyReport)
router.get('/weekly/:userId', reportController.getWeeklyReportByUser)
router.get('/stats', reportController.getStats)
router.get('/stats/:userId', reportController.getStatsByUser)

// 薄弱点画像（错因占比 + 薄弱知识点，学生/家长共用）
router.get('/error-profile/:studentId', reportController.getErrorProfile)

// Student-specific routes
router.get('/student/:studentId/daily', reportController.getDailyReport)
router.get('/student/:studentId/weekly', reportController.getWeeklyReportByStudent)

// Parent-specific routes
router.get('/parent/:parentId/child', reportController.getChildReport)

export default router