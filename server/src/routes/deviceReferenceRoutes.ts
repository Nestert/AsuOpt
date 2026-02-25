import express from 'express';
import { DeviceReferenceController } from '../controllers/DeviceReferenceController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateQuery } from '../middleware/validation';
import { deviceReferenceListQuerySchema, deviceReferenceTreeQuerySchema } from '../validation/schemas';

const router = express.Router();

router.use(authenticateToken);

// Получение всех устройств
router.get('/', validateQuery(deviceReferenceListQuerySchema), DeviceReferenceController.getAllDevices);

// Получение дерева устройств
router.get('/tree', validateQuery(deviceReferenceTreeQuerySchema), DeviceReferenceController.getDeviceTree);

// Очистка всех справочников
router.delete('/clear', requireAdmin, DeviceReferenceController.clearAllReferences);

// Удаление дубликатов (до /:id, чтобы не конфликтовать)
router.delete('/duplicates', requireAdmin, DeviceReferenceController.removeDuplicates);

// Поиск устройств
router.get('/search', DeviceReferenceController.searchDevices);

// Получение нескольких устройств по ID
router.post('/by-ids', DeviceReferenceController.getDevicesByIds);

// Массовое обновление устройств
router.put('/batch', requireAdmin, DeviceReferenceController.batchUpdateDevices);

// Получение устройства по ID с полными данными
router.get('/:id', DeviceReferenceController.getDeviceById);

// Обновление устройства по ID
router.put('/:id', DeviceReferenceController.updateDeviceReference);

// Удаление устройства по ID
router.delete('/:id', DeviceReferenceController.deleteDeviceById);

// Создание нового устройства
router.post('/', DeviceReferenceController.createDeviceReference);

export default router; 
