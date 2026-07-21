import { Router } from 'express'
import { UserController } from '../controllers/UserController'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
const userController = new UserController()

// Protected routes
router.use(authenticate)

router.get('/', authorize('admin'), userController.getAllUsers)
router.get('/:id', userController.getUserById)
router.put('/:id', userController.updateUser)
router.delete('/:id', authorize('admin'), userController.deleteUser)

// Student-specific routes
router.get('/student/:studentId/questions', userController.getStudentQuestions)
router.get('/student/:studentId/stats', userController.getStudentStats)

// Parent-specific routes
router.get('/parent/:parentId/child', userController.getParentChild)

export default router