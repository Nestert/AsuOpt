import express, { Request, Response, NextFunction } from 'express';
import { DatabaseController } from '../controllers/databaseController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateParams } from '../middleware/validation';
import { databaseTableNameParamSchema } from '../validation/schemas';

const router = express.Router();

router.use(authenticateToken, requireAdmin);

// Получение списка всех таблиц
router.get('/tables', (req: Request, res: Response, next: NextFunction) => {
  DatabaseController.getAllTables(req, res)
    .catch(next);
});

// Очистка конкретной таблицы
router.delete('/tables/:tableName', validateParams(databaseTableNameParamSchema), (req: Request, res: Response, next: NextFunction) => {
  DatabaseController.clearTable(req, res)
    .catch(next);
});

export default router; 
