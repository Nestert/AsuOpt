import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as importController from '../controllers/importController';

const router = express.Router();

// Настройка хранилища для multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Ограничение на типы файлов
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Принимать только Excel и CSV файлы
  if (
    file.mimetype === 'application/vnd.ms-excel' || 
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.mimetype === 'text/csv'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB
  }
});

// Роут для импорта файла
router.post('/file', upload.single('file'), (req: Request, res: Response, next: NextFunction) => {
  importController.importFile(req, res)
    .catch(next);
});

export default router; 