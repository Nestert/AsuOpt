import express, { Request, Response, NextFunction } from 'express';
import * as deviceTypeSignalController from '../controllers/deviceTypeSignalController';

const router = express.Router();

// Получение списка уникальных типов устройств
router.get('/unique-device-types', (req: Request, res: Response, next: NextFunction) => {
  deviceTypeSignalController.getUniqueDeviceTypes(req, res).catch(next);
});

// Получение списка уникальных типов устройств из таблицы DeviceReference
router.get('/unique-device-types-reference', (req: Request, res: Response, next: NextFunction) => {
  deviceTypeSignalController.getUniqueDeviceTypesFromReference(req, res).catch(next);
});

// Получение сводной таблицы сигналов
router.get('/summary', (req: Request, res: Response, next: NextFunction) => {
  deviceTypeSignalController.getSignalsSummary(req, res).catch(next);
});

export default router;
