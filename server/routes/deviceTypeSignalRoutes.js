const express = require('express');
const deviceTypeSignalController = require('../controllers/deviceTypeSignalController');

const router = express.Router();

// Получение всех записей сигналов типов устройств
router.get('/', deviceTypeSignalController.getAllDeviceTypeSignals);

// Получение списка уникальных типов устройств
router.get('/unique-device-types', deviceTypeSignalController.getUniqueDeviceTypes);

// Получение сводной таблицы сигналов
router.get('/summary', deviceTypeSignalController.getSignalsSummary);

// Получение записи для конкретного типа устройства
router.get('/type/:deviceType', deviceTypeSignalController.getDeviceTypeSignalByType);

// Обновить или создать запись для типа устройства
router.post('/', deviceTypeSignalController.updateDeviceTypeSignal);

// Удалить запись для типа устройства
router.delete('/type/:deviceType', deviceTypeSignalController.deleteDeviceTypeSignal);

module.exports = router; 