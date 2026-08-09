import { Router } from 'express'
import { AdminController } from '../controllers/AdminController'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
const adminController = new AdminController()

// Protected routes (admin only)
router.use(authenticate)
router.use(authorize('admin'))

router.get('/users', adminController.getAllUsers)
router.get('/users/:id', adminController.getUserById)
router.put('/users/:id', adminController.updateUser)
router.put('/users/:id/password', adminController.resetUserPassword)
router.delete('/users/:id', adminController.deleteUser)

router.get('/questions', adminController.getAllQuestions)
router.get('/questions/:id', adminController.getQuestionById)

router.get('/stats', adminController.getSystemStats)
router.get('/health', adminController.getSystemHealth)

router.get('/config', adminController.getSystemConfig)
router.put('/config', adminController.updateSystemConfig)

export default router