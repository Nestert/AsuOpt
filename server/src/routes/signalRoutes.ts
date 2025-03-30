import express, { Request, Response, NextFunction } from 'express';
import * as signalController from '../controllers/signalController';

const router = express.Router();

// Получение всех сигналов
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  signalController.getAllSignals(req, res)
    .catch(next);
});

// Получение сводки по сигналам (сумма по типам)
router.get('/summary', (req: Request, res: Response, next: NextFunction) => {
  signalController.getSignalsSummary(req, res)
    .catch(next);
});

// Получение сигналов по типу
router.get('/type/:type', (req: Request, res: Response, next: NextFunction) => {
  signalController.getSignalsByType(req, res)
    .catch(next);
});

// Получение сигналов для конкретного устройства
router.get('/device/:deviceId', (req: Request, res: Response, next: NextFunction) => {
  signalController.getDeviceSignals(req, res)
    .catch(next);
});

// Назначение сигнала устройству
router.post('/assign', (req: Request, res: Response, next: NextFunction) => {
  signalController.assignSignalToDevice(req, res)
    .catch(next);
});

// Создание нового сигнала
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  signalController.createSignal(req, res)
    .catch(next);
});

// Обновление сигнала
router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  signalController.updateSignal(req, res)
    .catch(next);
});

// Удаление сигнала
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  signalController.deleteSignal(req, res)
    .catch(next);
});

// Удаление назначения сигнала устройству
router.delete('/device/:deviceId/signal/:signalId', (req: Request, res: Response, next: NextFunction) => {
  signalController.removeSignalFromDevice(req, res)
    .catch(next);
});

// Удаление всех сигналов
router.delete('/clear', (req: Request, res: Response, next: NextFunction) => {
  signalController.clearAllSignals(req, res)
    .catch(next);
});

export default router; 