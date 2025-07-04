import express, { Request, Response, NextFunction } from 'express';
import * as exportController from '../controllers/exportController';

const router = express.Router();

// Экспорт в Excel
router.get('/excel', (req: Request, res: Response, next: NextFunction) => {
  exportController.exportToExcel(req, res)
    .catch(next);
});

// Экспорт сигналов в Excel
router.post('/signals', (req: Request, res: Response, next: NextFunction) => {
  exportController.exportSignalsToExcel(req, res)
    .catch(next);
});

export default router; 