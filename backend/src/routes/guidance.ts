import { Router } from 'express'
import { GuidanceController } from '../controllers/GuidanceController'
import { authenticate } from '../middleware/auth'

const router = Router()
const guidanceController = new GuidanceController()

// Protected routes
router.use(authenticate)

// 阶梯式引导提示（检索练习防剧透）：POST { questionId, level }
router.post('/', guidanceController.askGuidance)

export default router
