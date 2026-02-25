import express from 'express';
import { DeviceReferenceController } from '../controllers/DeviceReferenceController';

const router = express.Router();

// Получение всех устройств
router.get('/', DeviceReferenceController.getAllDevices);

// Получение дерева устройств
router.get('/tree', DeviceReferenceController.getDeviceTree);

// Очистка всех справочников
router.delete('/clear', DeviceReferenceController.clearAllReferences);

// Удаление дубликатов (до /:id, чтобы не конфликтовать)
router.delete('/duplicates', DeviceReferenceController.removeDuplicates);

// Поиск устройств
router.get('/search', DeviceReferenceController.searchDevices);

// Получение нескольких устройств по ID
router.post('/by-ids', DeviceReferenceController.getDevicesByIds);

// Массовое обновление устройств
router.put('/batch', DeviceReferenceController.batchUpdateDevices);

// Получение устройства по ID с полными данными
router.get('/:id', DeviceReferenceController.getDeviceById);

// Обновление устройства по ID
router.put('/:id', DeviceReferenceController.updateDeviceReference);

// Удаление устройства по ID
router.delete('/:id', DeviceReferenceController.deleteDeviceById);

// Создание нового устройства
router.post('/', DeviceReferenceController.createDeviceReference);

export default router; 