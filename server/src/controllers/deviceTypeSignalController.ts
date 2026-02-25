import { Request, Response } from 'express';
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

// Получить список уникальных типов устройств из таблицы Device
export const getUniqueDeviceTypes = async (req: Request, res: Response) => {
  try {
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
    
    const whereCondition: any = {
      deviceType: {
        [Op.not]: null,
        [Op.ne]: ''
      }
    };
    
    if (projectId) {
      whereCondition.projectId = parseInt(projectId as string, 10);
    }
    
    const deviceReferences = await DeviceReference.findAll({
      attributes: ['deviceType'],
      where: whereCondition,
      group: ['deviceType'],
      order: [['deviceType', 'ASC']]
    });
    
    const deviceTypes = deviceReferences.map(device => device.deviceType);
    console.log(`Получены типы устройств из DeviceReference для проекта ${projectId || 'все'}:`, deviceTypes);
    
    if (deviceTypes.length === 0 && !projectId) {
      console.log('В DeviceReference нет данных, создаем тестовые записи...');
      await createTestDeviceReferences();
      
      const updatedReferences = await DeviceReference.findAll({
        attributes: ['deviceType'],
        where: whereCondition,
        group: ['deviceType'],
        order: [['deviceType', 'ASC']]
      });
      
      const updatedTypes = updatedReferences.map(device => device.deviceType);
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
    const testDevices = [
      { posDesignation: 'FT-101', deviceType: 'Расходомер', description: 'Тестовый расходомер' },
      { posDesignation: 'PT-202', deviceType: 'Датчик давления', description: 'Тестовый датчик давления' },
      { posDesignation: 'TT-303', deviceType: 'Датчик температуры', description: 'Тестовый датчик температуры' },
      { posDesignation: 'LT-404', deviceType: 'Уровнемер', description: 'Тестовый уровнемер' },
      { posDesignation: 'XV-505', deviceType: 'Отсечной клапан', description: 'Тестовый отсечной клапан' }
    ];
    
    for (const device of testDevices) {
      await DeviceReference.create(device as any);
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
    
    // 1. Получаем все уникальные типы устройств для проекта (или все, если проект не указан)
    const deviceCountWhere: any = {
      deviceType: {
        [Op.not]: null,
        [Op.ne]: ''
      }
    };
    
    if (projectId) {
      deviceCountWhere.projectId = parseInt(projectId as string, 10);
    }

    const deviceTypeCounts = await DeviceReference.findAll({
      attributes: [
        'deviceType',
        [DeviceReference.sequelize!.fn('COUNT', DeviceReference.sequelize!.col('id')), 'count']
      ],
      where: deviceCountWhere,
      group: ['deviceType'],
      order: [['deviceType', 'ASC']]
    });

    const deviceCounts: {[key: string]: number} = {};
    const validDeviceTypes: string[] = [];
    
    deviceTypeCounts.forEach((result: any) => {
      deviceCounts[result.deviceType] = parseInt(result.getDataValue('count') || '0', 10);
      validDeviceTypes.push(result.deviceType);
    });

    // 2. Получаем количество сигналов по типам
    const signalCountsByType: {[key: string]: {ai: number, ao: number, di: number, do: number}} = {};
    
    validDeviceTypes.forEach(type => {
      signalCountsByType[type] = { ai: 0, ao: 0, di: 0, do: 0 };
    });

    try {
      let sqlQuery = `
        SELECT 
          dr.deviceType AS deviceType,
          s.type AS signalType,
          SUM(ds.count) AS total
        FROM device_signals ds
        INNER JOIN device_references dr ON ds.deviceId = dr.id
        INNER JOIN signals s ON ds.signalId = s.id
      `;

      const queryParams: any[] = [];
      
      if (projectId) {
        sqlQuery += ` WHERE dr.project_id = ?`;
        queryParams.push(parseInt(projectId as string, 10));
      }
      
      sqlQuery += ` GROUP BY dr.deviceType, s.type`;

      const signalResults = await Device.sequelize!.query(sqlQuery, {
        replacements: queryParams,
        type: 'SELECT'
      }) as any[];

      signalResults.forEach(result => {
        const deviceType = result.deviceType;
        const signalType = result.signalType;
        const total = parseInt(result.total) || 0;

        if (!signalCountsByType[deviceType]) {
          signalCountsByType[deviceType] = { ai: 0, ao: 0, di: 0, do: 0 };
        }

        switch (signalType) {
          case 'AI': signalCountsByType[deviceType].ai += total; break;
          case 'AO': signalCountsByType[deviceType].ao += total; break;
          case 'DI': signalCountsByType[deviceType].di += total; break;
          case 'DO': signalCountsByType[deviceType].do += total; break;
        }
      });
    } catch (sqlError) {
      console.error('Ошибка при выполнении запроса сигналов, возможно таблицы еще не созданы:', sqlError);
    }

    // 3. Формируем итоговый массив
    const deviceTypeSignals = validDeviceTypes.map(deviceType => {
      const counts = signalCountsByType[deviceType] || { ai: 0, ao: 0, di: 0, do: 0 };
      return {
        deviceType,
        deviceCount: deviceCounts[deviceType] || 0,
        aiCount: counts.ai,
        aoCount: counts.ao,
        diCount: counts.di,
        doCount: counts.do
      };
    });

    // 4. Вычисляем суммарные значения
    const summary: SignalSummary = {
      totalAI: 0, totalAO: 0, totalDI: 0, totalDO: 0, totalSignals: 0, totalDevices: 0
    };

    deviceTypeSignals.forEach(dts => {
      summary.totalAI += dts.aiCount;
      summary.totalAO += dts.aoCount;
      summary.totalDI += dts.diCount;
      summary.totalDO += dts.doCount;
      summary.totalDevices += dts.deviceCount;
    });

    summary.totalSignals = summary.totalAI + summary.totalAO + summary.totalDI + summary.totalDO;

    res.json({
      deviceTypeSignals,
      summary
    });
  } catch (error) {
    console.error('Ошибка при получении сводной таблицы сигналов:', error);
    res.status(500).json({ error: 'Не удалось получить сводную таблицу сигналов' });
  }
};
