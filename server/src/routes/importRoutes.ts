import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { ImportController } from '../controllers/importController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import {
  importAssignSignalsParamsSchema,
  importCsvBodySchema,
  importTempBodySchema,
  projectIdQuerySchema,
} from '../validation/schemas';

const router = express.Router();
const uploadDir = path.join(__dirname, '../../uploads');

router.use(authenticateToken, requireAdmin);

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${baseName}${ext.toLowerCase()}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      cb(new Error('Разрешены только CSV файлы'));
      return;
    }
    cb(null, true);
  },
});

// Маршруты импорта
router.post('/analyze', upload.single('file'), ImportController.analyzeFile);
router.post('/kip', upload.single('file'), validateBody(importCsvBodySchema), validateQuery(projectIdQuerySchema), ImportController.importKip);
router.post('/zra', upload.single('file'), validateBody(importCsvBodySchema), validateQuery(projectIdQuerySchema), ImportController.importZra);
router.post(
  '/signal-categories',
  upload.single('file'),
  validateBody(importCsvBodySchema),
  ImportController.importSignalCategories
);
router.post(
  '/assign-signals/:deviceType',
  validateParams(importAssignSignalsParamsSchema),
  validateQuery(projectIdQuerySchema),
  ImportController.assignSignalsToDevicesByType
);
router.post('/assign-signals-all', validateQuery(projectIdQuerySchema), ImportController.assignSignalsToAllDeviceTypes);
router.post('/temp', validateBody(importTempBodySchema), ImportController.importFromTemp);
router.get('/stats', ImportController.getStats);

export default router; 
