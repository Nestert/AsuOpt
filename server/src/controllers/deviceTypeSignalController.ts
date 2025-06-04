import { Request, Response } from 'express';
import { DeviceTypeSignal } from '../models/DeviceTypeSignal';
import { Device } from '../models/Device';
import { DeviceReference } from '../models/DeviceReference';
import { Op } from 'sequelize';

// Интерфейс для объекта сводки
interface SignalSummary {
  totalAI: number;
  totalAO: number;
  totalDI: number;
  totalDO: number;
  totalSignals: number;
  totalDevices: number;
}

// Контроллер для работы с сигналами типов устройств
export const getAllDeviceTypeSignals = async (req: Request, res: Response) => {
  try {
    const deviceTypeSignals = await DeviceTypeSignal.findAll({
      order: [['deviceType', 'ASC']]
    });
    
    res.json(deviceTypeSignals);
  } catch (error) {
    console.error('Ошибка при получении сигналов типов устройств:', error);
    res.status(500).json({ error: 'Не удалось получить сигналы типов устройств' });
  }
};

// Получить список уникальных типов устройств из таблицы Device
export const getUniqueDeviceTypes = async (req: Request, res: Response) => {
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
};

// Получить список уникальных типов устройств из таблицы DeviceReference
export const getUniqueDeviceTypesFromReference = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    console.log(`Вызов метода getUniqueDeviceTypesFromReference для проекта ${projectId || 'все'}`);
    
    // Формируем условие фильтрации по проекту
    const whereCondition: any = {
      deviceType: {
        [Op.not]: null,
        [Op.ne]: ''
      }
    };
    
    if (projectId) {
      whereCondition.projectId = parseInt(projectId as string, 10);
    }
    
    // Получаем все уникальные типы устройств из таблицы DeviceReference
    const deviceReferences = await DeviceReference.findAll({
      attributes: ['deviceType'],
      where: whereCondition,
      group: ['deviceType'],
      order: [['deviceType', 'ASC']]
    });
    
    // Извлекаем только значения типов устройств
    const deviceTypes = deviceReferences.map(device => device.deviceType);
    
    console.log(`Получены типы устройств из DeviceReference для проекта ${projectId || 'все'}:`, deviceTypes);
    
    // Если типов устройств нет и не указан проект, создаем тестовые данные
    if (deviceTypes.length === 0 && !projectId) {
      console.log('В DeviceReference нет данных, создаем тестовые записи...');
      await createTestDeviceReferences();
      
      // Повторяем запрос после создания тестовых данных
      const updatedReferences = await DeviceReference.findAll({
        attributes: ['deviceType'],
        where: whereCondition,
        group: ['deviceType'],
        order: [['deviceType', 'ASC']]
      });
      
      const updatedTypes = updatedReferences.map(device => device.deviceType);
      console.log('После создания тестовых данных, получены типы устройств:', updatedTypes);
      
      res.json(updatedTypes);
    } else {
      res.json(deviceTypes);
    }
  } catch (error) {
    console.error('Ошибка при получении уникальных типов устройств из справочника:', error);
    res.status(500).json({ error: 'Не удалось получить уникальные типы устройств из справочника' });
  }
};

// Вспомогательная функция для создания тестовых записей в DeviceReference
async function createTestDeviceReferences() {
  try {
    // Создаем несколько тестовых типов устройств
    const testDevices = [
      { posDesignation: 'FT-101', deviceType: 'Расходомер', description: 'Тестовый расходомер' },
      { posDesignation: 'PT-202', deviceType: 'Датчик давления', description: 'Тестовый датчик давления' },
      { posDesignation: 'TT-303', deviceType: 'Датчик температуры', description: 'Тестовый датчик температуры' },
      { posDesignation: 'LT-404', deviceType: 'Уровнемер', description: 'Тестовый уровнемер' },
      { posDesignation: 'XV-505', deviceType: 'Отсечной клапан', description: 'Тестовый отсечной клапан' }
    ];
    
    // Создаем записи в базе данных
    for (const device of testDevices) {
      await DeviceReference.create(device);
    }
    
    console.log('Тестовые данные успешно добавлены в DeviceReference');
  } catch (error) {
    console.error('Ошибка при создании тестовых данных в DeviceReference:', error);
  }
}

// Получить сводную таблицу сигналов
export const getSignalsSummary = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    console.log(`getSignalsSummary: получаем сводку для проекта ${projectId || 'все'}`);
    
    // DeviceTypeSignal не связана с проектами, получаем все записи
    const deviceTypeSignals = await DeviceTypeSignal.findAll({
      order: [['deviceType', 'ASC']]
    });
    
    // Получаем количество устройств для каждого типа
    const deviceCounts: {[key: string]: number} = {};
    
    // Формируем условие фильтрации по проекту для DeviceReference
    const deviceCountWhere: any = {
      deviceType: {
        [Op.not]: null,
        [Op.ne]: ''
      }
    };
    
    if (projectId) {
      deviceCountWhere.projectId = parseInt(projectId as string, 10);
    }
    
    // Получаем число устройств для каждого типа из таблицы DeviceReference
    const deviceTypeCounts = await DeviceReference.findAll({
      attributes: [
        'deviceType',
        [DeviceReference.sequelize!.fn('COUNT', DeviceReference.sequelize!.col('id')), 'count']
      ],
      where: deviceCountWhere,
      group: ['deviceType']
    });
    
    // Создаем объект с количеством устройств для каждого типа
    deviceTypeCounts.forEach((result: any) => {
      deviceCounts[result.deviceType] = parseInt(result.getDataValue('count'));
    });
    
    // Проверяем существование необходимых таблиц перед выполнением запроса
    try {
      // Формируем объект для хранения количества сигналов по типам устройств
      const signalCountsByType: {[key: string]: {ai: number, ao: number, di: number, do: number}} = {};
      
      // Проверяем наличие таблиц device_signals и signals
      let deviceSignalsExists = false;
      let signalsExists = false;
      
      try {
        // Пробуем получить запись из таблицы device_signals, чтобы проверить её существование
        await Device.sequelize!.query(
          "SELECT 1 FROM device_signals LIMIT 1",
          { type: 'SELECT' }
        );
        deviceSignalsExists = true;
      } catch (tableError) {
        console.log('Таблица device_signals не существует или недоступна');
        deviceSignalsExists = false;
      }
      
      try {
        // Пробуем получить запись из таблицы signals, чтобы проверить её существование
        await Device.sequelize!.query(
          "SELECT 1 FROM signals LIMIT 1",
          { type: 'SELECT' }
        );
        signalsExists = true;
      } catch (tableError) {
        console.log('Таблица signals не существует или недоступна');
        signalsExists = false;
      }
      
      // Если обе таблицы существуют, выполняем запрос для получения данных о сигналах
      if (deviceSignalsExists && signalsExists) {
        // Получаем информацию о сигналах из таблицы device_signals с помощью отдельных запросов
        // для избежания ошибок с именами таблиц
        console.log('Выполняем запрос для получения количества сигналов...');
        
        // Используем упрощенный запрос для снижения вероятности ошибок
        let signalCountsQuery = `
          SELECT dr.deviceType as deviceType, s.type as signalType, SUM(ds.count) as total
          FROM device_signals ds
          JOIN device_references dr ON ds.deviceId = dr.id
          JOIN signals s ON ds.signalId = s.id
          WHERE dr.deviceType IS NOT NULL AND dr.deviceType != ''
        `;
        
        // Добавляем фильтрацию по проекту, если указан
        if (projectId) {
          signalCountsQuery += ` AND dr.project_id = ${parseInt(projectId as string, 10)}`
        }
        
        signalCountsQuery += ` GROUP BY dr.deviceType, s.type`;
        
        try {
          const signalResults: any[] = await Device.sequelize!.query(signalCountsQuery, {
            type: 'SELECT'
          });
          
          console.log('Получены результаты запроса:', signalResults);
          
          // Проверяем, что получены корректные результаты
          if (Array.isArray(signalResults) && signalResults.length > 0) {
            // Заполняем объект signalCountsByType данными из запроса
            signalResults.forEach(result => {
              // Проверяем наличие необходимых полей в результате
              if (result && result.deviceType && result.signalType && result.total !== undefined) {
                const deviceType = result.deviceType;
                const signalType = result.signalType;
                const total = parseInt(result.total) || 0;
                
                if (!signalCountsByType[deviceType]) {
                  signalCountsByType[deviceType] = {ai: 0, ao: 0, di: 0, do: 0};
                }
                
                switch(signalType) {
                  case 'AI':
                    signalCountsByType[deviceType].ai += total;
                    break;
                  case 'AO':
                    signalCountsByType[deviceType].ao += total;
                    break;
                  case 'DI':
                    signalCountsByType[deviceType].di += total;
                    break;
                  case 'DO':
                    signalCountsByType[deviceType].do += total;
                    break;
                }
              } else {
                console.warn('Найдена запись с неверным форматом:', result);
              }
            });
          } else {
            console.log('Запрос выполнен успешно, но результаты отсутствуют или имеют неверный формат');
          }
        } catch (sqlError) {
          console.error('Ошибка при выполнении SQL-запроса:', sqlError);
          // Если возникла ошибка в SQL-запросе, продолжаем работу без данных о сигналах
        }
      } else {
        console.log('Таблицы device_signals или signals не существуют, используем данные из DeviceTypeSignal');
      }
      
      // Получаем типы устройств, которые есть в текущем проекте
      const projectDeviceTypes = Object.keys(deviceCounts);
      
      // Фильтруем DeviceTypeSignal только по типам устройств текущего проекта
      const filteredDeviceTypeSignals = projectId 
        ? deviceTypeSignals.filter(dts => projectDeviceTypes.includes(dts.deviceType))
        : deviceTypeSignals;
      
      // Добавляем количество устройств и сигналов к каждой записи
      const deviceTypeSignalsWithCounts = filteredDeviceTypeSignals.map(dts => {
        const deviceType = dts.deviceType;
        const signalCounts = signalCountsByType[deviceType] || {ai: 0, ao: 0, di: 0, do: 0};
        
        return {
          ...dts.toJSON(),
          deviceCount: deviceCounts[deviceType] || 0,
          // Используем реальные значения из device_signals, если они есть,
          // иначе используем значения из DeviceTypeSignal
          aiCount: signalCounts.ai || dts.aiCount || 0,
          aoCount: signalCounts.ao || dts.aoCount || 0,
          diCount: signalCounts.di || dts.diCount || 0,
          doCount: signalCounts.do || dts.doCount || 0
        };
      });
      
      // Вычисляем суммарные значения для статистики
      const summary: SignalSummary = {
        totalAI: 0,
        totalAO: 0,
        totalDI: 0,
        totalDO: 0,
        totalSignals: 0,
        totalDevices: 0
      };
      
      // Суммируем значения из всех записей
      deviceTypeSignalsWithCounts.forEach(dts => {
        summary.totalAI += dts.aiCount || 0;
        summary.totalAO += dts.aoCount || 0;
        summary.totalDI += dts.diCount || 0;
        summary.totalDO += dts.doCount || 0;
        summary.totalDevices += dts.deviceCount || 0;
      });
      
      // Вычисляем общее количество сигналов
      summary.totalSignals = summary.totalAI + summary.totalAO + summary.totalDI + summary.totalDO;
      
      // Формируем объект с данными для сводной таблицы
      const result = {
        deviceTypeSignals: deviceTypeSignalsWithCounts,
        summary
      };
      
      res.json(result);
    } catch (innerError) {
      console.error('Ошибка при обработке данных о сигналах:', innerError);
      
      // Получаем типы устройств, которые есть в текущем проекте
      const projectDeviceTypes = Object.keys(deviceCounts);
      
      // Фильтруем DeviceTypeSignal только по типам устройств текущего проекта
      const filteredDeviceTypeSignals = projectId 
        ? deviceTypeSignals.filter(dts => projectDeviceTypes.includes(dts.deviceType))
        : deviceTypeSignals;
      
      // Формируем ответ только с базовыми данными из DeviceTypeSignal
      const basicDeviceTypeSignals = filteredDeviceTypeSignals.map(dts => ({
        ...dts.toJSON(),
        deviceCount: deviceCounts[dts.deviceType] || 0
      }));
      
      // Вычисляем суммарные значения для статистики
      const basicSummary: SignalSummary = {
        totalAI: basicDeviceTypeSignals.reduce((sum, dts) => sum + (dts.aiCount || 0), 0),
        totalAO: basicDeviceTypeSignals.reduce((sum, dts) => sum + (dts.aoCount || 0), 0),
        totalDI: basicDeviceTypeSignals.reduce((sum, dts) => sum + (dts.diCount || 0), 0),
        totalDO: basicDeviceTypeSignals.reduce((sum, dts) => sum + (dts.doCount || 0), 0),
        totalDevices: basicDeviceTypeSignals.reduce((sum, dts) => sum + (dts.deviceCount || 0), 0),
        totalSignals: 0
      };
      
      basicSummary.totalSignals = basicSummary.totalAI + basicSummary.totalAO + 
                                 basicSummary.totalDI + basicSummary.totalDO;
      
      // Формируем объект с данными для сводной таблицы
      const basicResult = {
        deviceTypeSignals: basicDeviceTypeSignals,
        summary: basicSummary
      };
      
      res.json(basicResult);
    }
  } catch (error) {
    console.error('Ошибка при получении сводной таблицы сигналов:', error);
    res.status(500).json({ error: 'Не удалось получить сводную таблицу сигналов' });
  }
};

// Получить запись для конкретного типа устройства
export const getDeviceTypeSignalByType = async (req: Request, res: Response) => {
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
};

// Обновить или создать запись для типа устройства
export const updateDeviceTypeSignal = async (req: Request, res: Response) => {
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
};

// Удалить запись для типа устройства
export const deleteDeviceTypeSignal = async (req: Request, res: Response) => {
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
};

// Очистить все записи в таблице
export const clearAllDeviceTypeSignals = async (req: Request, res: Response) => {
  try {
    console.log('Вызов метода clearAllDeviceTypeSignals');
    
    // Удаляем все записи из таблицы
    await DeviceTypeSignal.destroy({
      where: {},
      truncate: true
    });
    
    console.log('Таблица сигналов типов устройств успешно очищена');
    
    res.json({ message: 'Таблица сигналов типов устройств успешно очищена' });
  } catch (error) {
    console.error('Ошибка при очистке таблицы сигналов типов устройств:', error);
    res.status(500).json({ error: 'Не удалось очистить таблицу сигналов типов устройств' });
  }
}; 