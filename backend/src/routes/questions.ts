import { Router } from 'express'
import { QuestionController } from '../controllers/QuestionController'
import { authenticate, authorize } from '../middleware/auth'
import multer from 'multer'

const router = Router()
const questionController = new QuestionController()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop())
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

// Protected routes
router.use(authenticate)

router.get('/', questionController.getAllQuestions)
router.get('/:id', questionController.getQuestionById)
router.post('/', upload.single('image'), questionController.createQuestion)
router.put('/:id', questionController.updateQuestion)
router.delete('/:id', questionController.deleteQuestion)

// AI identification
router.post(
  '/identify',
  upload.single('image'),
  questionController.identifyQuestion
)

// Student-specific routes
router.get(
  '/student/:studentId',
  questionController.getQuestionsByStudent
)

// Search and stats
router.get('/search', questionController.searchQuestions)
router.get('/stats/:studentId', questionController.getQuestionStats)

export default router