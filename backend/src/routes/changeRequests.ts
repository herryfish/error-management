import { Router } from 'express'
import { ChangeRequestController } from '../controllers/ChangeRequestController'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
const changeRequestController = new ChangeRequestController()

// Protected routes
router.use(authenticate)

router.get('/', changeRequestController.getAll)
router.get('/stats', changeRequestController.getStats)
router.get('/:id', changeRequestController.getById)
router.post('/', changeRequestController.create)
router.put('/:id/approve', authorize('admin'), changeRequestController.approve)
router.put('/:id/reject', authorize('admin'), changeRequestController.reject)
router.put('/:id/status', changeRequestController.updateStatus)

export default router