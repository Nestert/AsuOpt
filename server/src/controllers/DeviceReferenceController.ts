import { Request, Response } from 'express';
import { DeviceReference } from '../models/DeviceReference';
import { Kip } from '../models/Kip';
import { Zra } from '../models/Zra';
import { Op } from 'sequelize';

export class DeviceReferenceController {
  // Получение всех устройств из справочника
  static async getAllDevices(req: Request, res: Response): Promise<void> {
    try {
      const devices = await DeviceReference.findAll({
        order: [['posDesignation', 'ASC']]
      });
      
      res.json(devices);
    } catch (error) {
      console.error('Ошибка при получении устройств:', error);
      res.status(500).json({ 
        message: 'Ошибка при получении устройств', 
        error: error.message 
      });
    }
  }

  // Получение устройства по ID с подробными данными
  static async getDeviceById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Получаем устройство из справочника
      const deviceRef = await DeviceReference.findByPk(id);
      
      if (!deviceRef) {
        res.status(404).json({ message: 'Устройство не найдено' });
        return;
      }
      
      // Ищем данные в таблице КИП
      const kipData = await Kip.findOne({
        where: { deviceReferenceId: id }
      });
      
      // Ищем данные в таблице ЗРА
      const zraData = await Zra.findOne({
        where: { deviceReferenceId: id }
      });
      
      // Формируем полные данные устройства
      const deviceData = {
        reference: deviceRef,
        kip: kipData,
        zra: zraData,
        // Определяем тип данных по наличию записей
        dataType: kipData ? 'kip' : (zraData ? 'zra' : 'unknown')
      };
      
      res.json(deviceData);
    } catch (error) {
      console.error('Ошибка при получении устройства:', error);
      res.status(500).json({ 
        message: 'Ошибка при получении устройства', 
        error: error.message 
      });
    }
  }

  // Поиск устройств по части позиционного обозначения
  static async searchDevices(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ message: 'Параметр поиска не указан' });
        return;
      }
      
      const devices = await DeviceReference.findAll({
        where: {
          posDesignation: {
            [Op.like]: `%${query}%`
          }
        },
        order: [['posDesignation', 'ASC']],
        limit: 50 // Ограничиваем количество результатов
      });
      
      res.json(devices);
    } catch (error) {
      console.error('Ошибка при поиске устройств:', error);
      res.status(500).json({ 
        message: 'Ошибка при поиске устройств', 
        error: error.message 
      });
    }
  }

  // Получение дерева устройств
  static async getDeviceTree(req: Request, res: Response): Promise<void> {
    try {
      // Группируем устройства по типу и первой части позиционного обозначения
      const devices = await DeviceReference.findAll({
        order: [['posDesignation', 'ASC']]
      });
      
      // Создаем структуру дерева
      const tree = [];
      const deviceTypes = {};
      
      // Сначала группируем по типу устройства
      devices.forEach(device => {
        const { deviceType } = device;
        
        if (!deviceTypes[deviceType]) {
          deviceTypes[deviceType] = {
            id: `type_${deviceType}`,
            name: deviceType,
            children: []
          };
          tree.push(deviceTypes[deviceType]);
        }
        
        // Группируем по первой части позиционного обозначения (до первой точки)
        const posDesignation = device.posDesignation;
        const posPrefix = posDesignation.split('.')[0];
        
        let prefixGroup = deviceTypes[deviceType].children.find(
          group => group.id === `prefix_${posPrefix}`
        );
        
        if (!prefixGroup) {
          prefixGroup = {
            id: `prefix_${posPrefix}`,
            name: posPrefix,
            children: []
          };
          deviceTypes[deviceType].children.push(prefixGroup);
        }
        
        // Добавляем устройство в соответствующую группу
        prefixGroup.children.push({
          id: device.id,
          name: device.posDesignation,
          description: device.description,
          type: device.deviceType,
          isLeaf: true
        });
      });
      
      res.json(tree);
    } catch (error) {
      console.error('Ошибка при получении дерева устройств:', error);
      res.status(500).json({ 
        message: 'Ошибка при получении дерева устройств', 
        error: error.message 
      });
    }
  }
} 