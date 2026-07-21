import { Router } from 'express'
import { AuthController } from '../controllers/AuthController'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
const authController = new AuthController()

// Public routes
router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/refresh-token', authController.refreshToken)

// Protected routes
router.post('/logout', authenticate, authController.logout)
router.get('/me', authenticate, authController.me)

// Parent-Student binding routes
router.post('/bind', authenticate, authorize('parent'), authController.bindParentStudent)
router.post('/unlink', authenticate, authController.unlinkParentStudent)

export default router