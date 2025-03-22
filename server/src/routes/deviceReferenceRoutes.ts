import express from 'express';
import { DeviceReferenceController } from '../controllers/DeviceReferenceController';

const router = express.Router();

// Получение всех устройств
router.get('/', DeviceReferenceController.getAllDevices);

// Получение дерева устройств
router.get('/tree', DeviceReferenceController.getDeviceTree);

// Поиск устройств
router.get('/search', DeviceReferenceController.searchDevices);

// Получение устройства по ID с полными данными
router.get('/:id', DeviceReferenceController.getDeviceById);

export default router; 