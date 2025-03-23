import express from 'express';
import { DeviceReferenceController } from '../controllers/DeviceReferenceController';

const router = express.Router();

// Получение всех устройств
router.get('/', DeviceReferenceController.getAllDevices);

// Получение дерева устройств
router.get('/tree', DeviceReferenceController.getDeviceTree);

// Очистка всех справочников
router.delete('/clear', DeviceReferenceController.clearAllReferences);

// Поиск устройств
router.get('/search', DeviceReferenceController.searchDevices);

// Получение устройства по ID с полными данными
router.get('/:id', DeviceReferenceController.getDeviceById);

// Обновление устройства по ID
router.put('/:id', DeviceReferenceController.updateDeviceReference);

// Удаление устройства по ID
router.delete('/:id', DeviceReferenceController.deleteDeviceById);

// Создание нового устройства
router.post('/', DeviceReferenceController.createDeviceReference);

export default router; 