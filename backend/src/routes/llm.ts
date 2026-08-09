import { Router } from 'express'
import { LLMController } from '../controllers/LLMController'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
const llmController = new LLMController()

// Protected routes
router.use(authenticate)

router.get('/usage', llmController.getUsage)
router.get('/usage/:userId', llmController.getUsageByUser)
router.get('/usage/summary', llmController.getUsageSummary)
router.get('/usage/by-user', authorize('admin'), llmController.getUsageByUserStats)
router.get('/usage/by-date', authorize('admin'), llmController.getUsageByDateStats)
router.get('/config', authorize('admin'), llmController.getConfig)
router.put('/config', authorize('admin'), llmController.updateConfig)

export default router