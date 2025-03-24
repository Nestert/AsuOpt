import express, { Request, Response, NextFunction } from 'express';
import { DatabaseController } from '../controllers/databaseController';

const router = express.Router();

// Получение списка всех таблиц
router.get('/tables', (req: Request, res: Response, next: NextFunction) => {
  DatabaseController.getAllTables(req, res)
    .catch(next);
});

// Очистка конкретной таблицы
router.delete('/tables/:tableName', (req: Request, res: Response, next: NextFunction) => {
  DatabaseController.clearTable(req, res)
    .catch(next);
});

export default router; 