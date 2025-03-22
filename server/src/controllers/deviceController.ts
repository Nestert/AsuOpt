import { Request, Response } from 'express';
import { Device } from '../models/Device';
import { Op } from 'sequelize';

// Получить иерархическую структуру устройств
export const getDeviceTree = async (req: Request, res: Response) => {
  try {
    console.log('Запрос на получение дерева устройств');
    
    // Получаем корневые устройства (без родителей)
    const rootDevices = await Device.findAll({
      where: {
        parentId: null
      },
      include: [
        {
          model: Device,
          as: 'children',
          include: [{ all: true, nested: true }]
        }
      ]
    });

    console.log(`Получено корневых устройств: ${rootDevices.length}`);
    
    // Добавляем расширенное логирование
    if (rootDevices.length > 0) {
      const device = rootDevices[0] as any; // Используем any для обхода проверки типов
      console.log('Пример устройства:', JSON.stringify({
        id: device.id,
        systemCode: device.systemCode,
        deviceDesignation: device.deviceDesignation,
        deviceType: device.deviceType,
        childrenCount: device.children ? device.children.length : 0
      }, null, 2));
    }
    
    // Проверяем если список пуст, выводим диагностическую информацию
    if (rootDevices.length === 0) {
      const allDevices = await Device.findAll();
      console.log(`Всего устройств в базе: ${allDevices.length}`);
      console.log('Пример устройств:', JSON.stringify(allDevices.slice(0, 5), null, 2));
      
      // Если нет корневых устройств, но есть устройства в базе,
      // возможно у них не установлен parentId в null явно
      // Обновляем все устройства без родителя (undefined, пустая строка) и устанавливаем parentId = null
      await Device.update(
        { parentId: null },
        { 
          where: { 
            [Op.or]: [
              { parentId: { [Op.is]: null } },
              { parentId: '' }
            ] 
          }
        }
      );
      
      // Получаем устройства еще раз после обновления
      const updatedRootDevices = await Device.findAll({
        where: {
          parentId: null
        },
        include: [
          {
            model: Device,
            as: 'children',
            include: [{ all: true, nested: true }]
          }
        ]
      });
      
      console.log(`После исправления получено корневых устройств: ${updatedRootDevices.length}`);
      return res.status(200).json(updatedRootDevices);
    }

    res.status(200).json(rootDevices);
  } catch (error) {
    console.error('Ошибка при получении дерева устройств:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении дерева устройств' });
  }
};

// Получить все устройства (плоский список)
export const getAllDevices = async (req: Request, res: Response) => {
  try {
    const devices = await Device.findAll();
    res.status(200).json(devices);
  } catch (error) {
    console.error('Ошибка при получении устройств:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении устройств' });
  }
};

// Получить устройство по ID
export const getDeviceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const device = await Device.findByPk(id, {
      include: [
        {
          model: Device,
          as: 'children'
        },
        {
          model: Device,
          as: 'parent'
        }
      ]
    });

    if (!device) {
      return res.status(404).json({ message: 'Устройство не найдено' });
    }

    res.status(200).json(device);
  } catch (error) {
    console.error('Ошибка при получении устройства:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении устройства' });
  }
};

// Создать новое устройство
export const createDevice = async (req: Request, res: Response) => {
  try {
    const deviceData = req.body;
    const newDevice = await Device.create(deviceData);
    res.status(201).json(newDevice);
  } catch (error) {
    console.error('Ошибка при создании устройства:', error);
    res.status(500).json({ message: 'Ошибка сервера при создании устройства' });
  }
};

// Обновить устройство
export const updateDevice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deviceData = req.body;
    
    const device = await Device.findByPk(id);
    if (!device) {
      return res.status(404).json({ message: 'Устройство не найдено' });
    }

    await device.update(deviceData);
    res.status(200).json(device);
  } catch (error) {
    console.error('Ошибка при обновлении устройства:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении устройства' });
  }
};

// Удалить устройство
export const deleteDevice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const device = await Device.findByPk(id);
    if (!device) {
      return res.status(404).json({ message: 'Устройство не найдено' });
    }

    await device.destroy();
    res.status(200).json({ message: 'Устройство успешно удалено' });
  } catch (error) {
    console.error('Ошибка при удалении устройства:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении устройства' });
  }
};

// Очистить базу данных устройств
export const clearAllDevices = async (req: Request, res: Response) => {
  try {
    console.log('Запрос на очистку базы данных устройств');
    
    // Получаем текущее количество устройств для информации
    const countBefore = await Device.count();
    console.log(`Найдено ${countBefore} устройств для удаления`);
    
    // Начинаем транзакцию
    const transaction = await Device.sequelize!.transaction();
    
    try {
      // Используем более безопасный метод для SQLite
      await Device.destroy({ 
        where: {},  // Удаляем все записи без truncate
        force: true, // Физическое удаление (не soft delete)
        transaction // Используем транзакцию
      });
      
      // Подтверждаем транзакцию
      await transaction.commit();
      
      console.log(`Очищена база данных. Удалено ${countBefore} устройств.`);
      
      res.status(200).json({ 
        message: 'База данных успешно очищена', 
        deletedCount: countBefore 
      });
    } catch (error) {
      // Откатываем транзакцию в случае ошибки
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при очистке базы данных:', error);
    res.status(500).json({ 
      message: 'Ошибка сервера при очистке базы данных',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Поиск устройств по параметрам
export const searchDevices = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Необходимо указать параметр query для поиска' });
    }

    const devices = await Device.findAll({
      where: {
        [Op.or]: [
          { systemCode: { [Op.like]: `%${query}%` } },
          { equipmentCode: { [Op.like]: `%${query}%` } },
          { deviceDesignation: { [Op.like]: `%${query}%` } },
          { deviceType: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } }
        ]
      }
    });

    res.status(200).json(devices);
  } catch (error) {
    console.error('Ошибка при поиске устройств:', error);
    res.status(500).json({ message: 'Ошибка сервера при поиске устройств' });
  }
}; 