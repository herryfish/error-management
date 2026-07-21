import { Router } from 'express'
import { SimilarController } from '../controllers/SimilarController'
import { authenticate } from '../middleware/auth'

const router = Router()
const similarController = new SimilarController()

// Protected routes
router.use(authenticate)

router.get('/', similarController.getAllSimilar)
router.get('/:id', similarController.getSimilarById)
router.post('/', similarController.generateSimilar)
router.put('/:id/apply', similarController.markAsApplicable)
router.put('/:id/not-apply', similarController.markAsNotApplicable)

// Question-specific routes
router.get('/question/:questionId', similarController.getSimilarByQuestion)

// Student-specific routes
router.get('/student/:studentId', similarController.getSimilarByStudent)

export default router