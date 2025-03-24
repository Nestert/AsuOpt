const DeviceTypeSignal = require('../models/deviceTypeSignal');
const Device = require('../models/device');
const { Op } = require('sequelize');

// Контроллер для работы с сигналами типов устройств
const deviceTypeSignalController = {
  // Получить все записи о сигналах типов устройств
  async getAllDeviceTypeSignals(req, res) {
    try {
      const deviceTypeSignals = await DeviceTypeSignal.findAll({
        order: [['deviceType', 'ASC']]
      });
      
      res.json(deviceTypeSignals);
    } catch (error) {
      console.error('Ошибка при получении сигналов типов устройств:', error);
      res.status(500).json({ error: 'Не удалось получить сигналы типов устройств' });
    }
  },
  
  // Получить список уникальных типов устройств из таблицы Device
  async getUniqueDeviceTypes(req, res) {
    try {
      // Получаем все уникальные типы устройств из таблицы Device
      const devices = await Device.findAll({
        attributes: ['deviceType'],
        where: {
          deviceType: {
            [Op.not]: null,
            [Op.ne]: ''
          }
        },
        group: ['deviceType'],
        order: [['deviceType', 'ASC']]
      });
      
      // Извлекаем только значения типов устройств
      const deviceTypes = devices.map(device => device.deviceType);
      
      res.json(deviceTypes);
    } catch (error) {
      console.error('Ошибка при получении уникальных типов устройств:', error);
      res.status(500).json({ error: 'Не удалось получить уникальные типы устройств' });
    }
  },
  
  // Получить сводную таблицу сигналов
  async getSignalsSummary(req, res) {
    try {
      const deviceTypeSignals = await DeviceTypeSignal.findAll({
        order: [['deviceType', 'ASC']]
      });
      
      // Вычисляем суммарные значения для статистики
      const summary = deviceTypeSignals.reduce((acc, dts) => {
        acc.totalAI += dts.aiCount || 0;
        acc.totalAO += dts.aoCount || 0;
        acc.totalDI += dts.diCount || 0;
        acc.totalDO += dts.doCount || 0;
        return acc;
      }, { totalAI: 0, totalAO: 0, totalDI: 0, totalDO: 0 });
      
      // Добавляем общее количество сигналов
      summary.totalSignals = summary.totalAI + summary.totalAO + summary.totalDI + summary.totalDO;
      
      // Формируем объект с данными для сводной таблицы
      const result = {
        deviceTypeSignals,
        summary
      };
      
      res.json(result);
    } catch (error) {
      console.error('Ошибка при получении сводной таблицы сигналов:', error);
      res.status(500).json({ error: 'Не удалось получить сводную таблицу сигналов' });
    }
  },
  
  // Получить запись для конкретного типа устройства
  async getDeviceTypeSignalByType(req, res) {
    try {
      const { deviceType } = req.params;
      
      const deviceTypeSignal = await DeviceTypeSignal.findOne({
        where: { deviceType }
      });
      
      if (!deviceTypeSignal) {
        return res.status(404).json({ error: 'Запись для данного типа устройства не найдена' });
      }
      
      res.json(deviceTypeSignal);
    } catch (error) {
      console.error(`Ошибка при получении записи для типа устройства ${req.params.deviceType}:`, error);
      res.status(500).json({ error: 'Не удалось получить запись для данного типа устройства' });
    }
  },
  
  // Обновить или создать запись для типа устройства
  async updateDeviceTypeSignal(req, res) {
    try {
      const { deviceType, aiCount, aoCount, diCount, doCount } = req.body;
      
      if (!deviceType) {
        return res.status(400).json({ error: 'Тип устройства не указан' });
      }
      
      // Пытаемся найти запись по типу устройства
      let deviceTypeSignal = await DeviceTypeSignal.findOne({
        where: { deviceType }
      });
      
      if (deviceTypeSignal) {
        // Если запись существует, обновляем её
        await deviceTypeSignal.update({
          aiCount: aiCount !== undefined ? aiCount : deviceTypeSignal.aiCount,
          aoCount: aoCount !== undefined ? aoCount : deviceTypeSignal.aoCount, 
          diCount: diCount !== undefined ? diCount : deviceTypeSignal.diCount,
          doCount: doCount !== undefined ? doCount : deviceTypeSignal.doCount
        });
      } else {
        // Если записи нет, создаем новую
        deviceTypeSignal = await DeviceTypeSignal.create({
          deviceType,
          aiCount: aiCount || 0,
          aoCount: aoCount || 0,
          diCount: diCount || 0,
          doCount: doCount || 0
        });
      }
      
      res.json(deviceTypeSignal);
    } catch (error) {
      console.error('Ошибка при обновлении/создании записи сигналов для типа устройства:', error);
      res.status(500).json({ error: 'Не удалось обновить/создать запись для типа устройства' });
    }
  },
  
  // Удалить запись для типа устройства
  async deleteDeviceTypeSignal(req, res) {
    try {
      const { deviceType } = req.params;
      
      const result = await DeviceTypeSignal.destroy({
        where: { deviceType }
      });
      
      if (result === 0) {
        return res.status(404).json({ error: 'Запись для данного типа устройства не найдена' });
      }
      
      res.json({ message: 'Запись успешно удалена' });
    } catch (error) {
      console.error(`Ошибка при удалении записи для типа устройства ${req.params.deviceType}:`, error);
      res.status(500).json({ error: 'Не удалось удалить запись для данного типа устройства' });
    }
  }
};

module.exports = deviceTypeSignalController; 