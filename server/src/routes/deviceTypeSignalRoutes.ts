import express, { Request, Response, NextFunction } from 'express';
import * as deviceTypeSignalController from '../controllers/deviceTypeSignalController';

const router = express.Router();

// Получение всех записей сигналов типов устройств
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  deviceTypeSignalController.getAllDeviceTypeSignals(req, res)
    .catch(next);
});

// Получение списка уникальных типов устройств
router.get('/unique-device-types', (req: Request, res: Response, next: NextFunction) => {
  deviceTypeSignalController.getUniqueDeviceTypes(req, res)
    .catch(next);
});

// Получение списка уникальных типов устройств из таблицы DeviceReference
router.get('/unique-device-types-reference', (req: Request, res: Response, next: NextFunction) => {
  deviceTypeSignalController.getUniqueDeviceTypesFromReference(req, res)
    .catch(next);
});

// Получение сводной таблицы сигналов
router.get('/summary', (req: Request, res: Response, next: NextFunction) => {
  deviceTypeSignalController.getSignalsSummary(req, res)
    .catch(next);
});

// Получение записи для конкретного типа устройства
router.get('/type/:deviceType', (req: Request, res: Response, next: NextFunction) => {
  deviceTypeSignalController.getDeviceTypeSignalByType(req, res)
    .catch(next);
});

// Обновить или создать запись для типа устройства
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  deviceTypeSignalController.updateDeviceTypeSignal(req, res)
    .catch(next);
});

// Удалить запись для типа устройства
router.delete('/type/:deviceType', (req: Request, res: Response, next: NextFunction) => {
  deviceTypeSignalController.deleteDeviceTypeSignal(req, res)
    .catch(next);
});

// Очистить все записи в таблице
router.delete('/clear', (req: Request, res: Response, next: NextFunction) => {
  deviceTypeSignalController.clearAllDeviceTypeSignals(req, res)
    .catch(next);
});

export default router; 