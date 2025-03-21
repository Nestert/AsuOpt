import express, { Request, Response, NextFunction } from 'express';
import * as deviceController from '../controllers/deviceController';

const router = express.Router();

// Получение дерева устройств
router.get('/tree', (req: Request, res: Response, next: NextFunction) => {
  deviceController.getDeviceTree(req, res)
    .catch(next);
});

// Получение всех устройств
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  deviceController.getAllDevices(req, res)
    .catch(next);
});

// Очистка базы данных устройств
router.delete('/clear', (req: Request, res: Response, next: NextFunction) => {
  deviceController.clearAllDevices(req, res)
    .catch(next);
});

// Получение устройства по ID
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  deviceController.getDeviceById(req, res)
    .catch(next);
});

// Создание устройства
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  deviceController.createDevice(req, res)
    .catch(next);
});

// Обновление устройства
router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  deviceController.updateDevice(req, res)
    .catch(next);
});

// Удаление устройства
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  deviceController.deleteDevice(req, res)
    .catch(next);
});

// Поиск устройств
router.get('/search', (req: Request, res: Response, next: NextFunction) => {
  deviceController.searchDevices(req, res)
    .catch(next);
});

export default router; 