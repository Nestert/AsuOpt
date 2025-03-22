import express from 'express';
import multer from 'multer';
import path from 'path';
import { ImportController } from '../controllers/ImportController';

const router = express.Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Маршруты импорта
router.post('/kip', upload.single('file'), ImportController.importKip);
router.post('/zra', upload.single('file'), ImportController.importZra);
router.post('/temp', ImportController.importFromTemp);
router.get('/stats', ImportController.getStats);

export default router; 