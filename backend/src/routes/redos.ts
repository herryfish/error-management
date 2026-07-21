import { Router } from 'express'
import { RedoController } from '../controllers/RedoController'
import { authenticate } from '../middleware/auth'
import multer from 'multer'

const router = Router()
const redoController = new RedoController()

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

router.get('/', redoController.getAllRedos)
router.get('/:id', redoController.getRedoById)
router.post('/', redoController.createRedo)
router.post(
  '/photo',
  upload.single('image'),
  redoController.createPhotoRedo
)
router.put('/:id/grade', redoController.gradeRedo)
router.put('/:id/remark', redoController.remarkRedo)

// Student-specific routes
router.get('/student/:studentId', redoController.getRedosByStudent)
router.get('/question/:questionId', redoController.getRedosByQuestion)

export default router