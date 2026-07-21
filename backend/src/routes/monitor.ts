import { Router } from 'express'
import { MonitorController } from '../controllers/MonitorController'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
const monitorController = new MonitorController()

// Public routes
router.get('/health', monitorController.getHealth)

// Protected routes
router.use(authenticate)
router.use(authorize('admin'))

router.get('/', monitorController.getAll)
router.get('/stats', monitorController.getStats)
router.get('/:id', monitorController.getById)
router.post('/', monitorController.create)
router.put('/:id/acknowledge', monitorController.acknowledge)

export default router