import { Request, Response } from 'express';
import { Signal } from '../models/Signal';
import { DeviceSignal } from '../models/DeviceSignal';
import { Device } from '../models/Device';
import { DeviceReference } from '../models/DeviceReference';
import { Op, Sequelize } from 'sequelize';

type SignalListQuery = {
  projectId?: number;
  filterByProject?: boolean;
  limit?: number;
  offset?: number;
  sort?: 'type' | 'name' | 'createdAt' | 'updatedAt' | 'totalCount';
  order?: 'ASC' | 'DESC';
  q?: string;
  type?: 'AI' | 'AO' | 'DI' | 'DO';
};

/**
 * @swagger
 * tags:
 *   - name: Signals
 *     description: Управление сигналами
 * /api/signals:
 *   get:
 *     summary: Получить список сигналов
 *     tags: [Signals]
 *     responses:
 *       200:
 *         description: Список сигналов
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Signal'
 *   post:
 *     summary: Создать новый сигнал
 *     tags: [Signals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Signal'
 *     responses:
 *       201:
 *         description: Сигнал создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Signal'
 *       400:
 *         description: Ошибка валидации
 * /api/signals/{id}:
 *   put:
 *     summary: Обновить сигнал
 *     tags: [Signals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID сигнала
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Signal'
 *     responses:
 *       200:
 *         description: Сигнал обновлен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Signal'
 *       404:
 *         description: Сигнал не найден
 *   delete:
 *     summary: Удалить сигнал
 *     tags: [Signals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID сигнала
 *     responses:
 *       200:
 *         description: Сигнал удален
 *       404:
 *         description: Сигнал не найден
 */

// Получение всех сигналов
export const getAllSignals = async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      filterByProject,
      limit,
      offset,
      sort,
      order,
      q,
      type,
    } = req.query as unknown as SignalListQuery;

    const hasPagination = typeof limit === 'number' || typeof offset === 'number';
    const sortField = sort ?? 'type';
    const sortOrder = order ?? 'ASC';
    const pagination: { limit?: number; offset?: number } = hasPagination
      ? { limit: limit ?? 100, offset: offset ?? 0 }
      : {};

    const buildSignalWhere = (signalIds?: number[]) => {
      const where: Record<PropertyKey, unknown> = {};

      if (type) {
        where.type = type;
      }

      if (q) {
        where[Op.or] = [
          { name: { [Op.like]: `%${q}%` } },
          { description: { [Op.like]: `%${q}%` } },
          { category: { [Op.like]: `%${q}%` } },
          { connectionType: { [Op.like]: `%${q}%` } },
          { voltage: { [Op.like]: `%${q}%` } },
        ];
      }

      if (signalIds) {
        where.id = { [Op.in]: signalIds };
      }

      return where;
    };

    const signalOrder: Array<[string, 'ASC' | 'DESC']> =
      sortField === 'type'
        ? [['type', sortOrder], ['name', 'ASC']]
        : [[sortField, sortOrder], ['name', 'ASC']];

    console.log(
      `getAllSignals: получаем сигналы для проекта ${projectId || 'все'}, фильтр по проекту: ${String(filterByProject)}`
    );
    
    // Если явно указан параметр filterByProject=true, фильтруем по проекту
    // Иначе возвращаем все сигналы (для справочника типов сигналов)
    if (projectId && filterByProject === true) {
      const signalIdRows = (await DeviceSignal.findAll({
        attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('signalId')), 'signalId']],
        include: [
          {
            model: DeviceReference,
            as: 'deviceReference',
            where: { projectId },
            required: true,
            attributes: [],
          },
        ],
        raw: true,
      })) as unknown as Array<{ signalId: number | string }>;

      const uniqueSignalIds = Array.from(
        new Set(
          signalIdRows
            .map((row) => Number(row.signalId))
            .filter((id) => Number.isFinite(id))
        )
      );

      if (uniqueSignalIds.length === 0) {
        if (hasPagination) {
          return res.status(200).json({
            items: [],
            total: 0,
            limit: pagination.limit,
            offset: pagination.offset,
          });
        }
        return res.status(200).json([]);
      }

      const where = buildSignalWhere(uniqueSignalIds);
      const signals = await Signal.findAll({
        where,
        order: signalOrder,
        ...pagination,
      });

      const total = hasPagination ? await Signal.count({ where }) : undefined;

      console.log(`getAllSignals: найдено ${signals.length} сигналов для проекта ${projectId}`);
      if (hasPagination) {
        return res.status(200).json({
          items: signals,
          total,
          limit: pagination.limit,
          offset: pagination.offset,
        });
      }
      return res.status(200).json(signals);
    } else {
      // Возвращаем все сигналы (для справочника типов сигналов)
      const where = buildSignalWhere();
      const signals = await Signal.findAll({
        where,
        order: signalOrder,
        ...pagination,
      });

      if (hasPagination) {
        const total = await Signal.count({ where });
        console.log(`getAllSignals: найдено ${signals.length} сигналов (paged)`);
        return res.status(200).json({
          items: signals,
          total,
          limit: pagination.limit,
          offset: pagination.offset,
        });
      }

      console.log(`getAllSignals: найдено ${signals.length} сигналов (все сигналы)`);
      return res.status(200).json(signals);
    }
  } catch (error) {
    console.error('Ошибка при получении сигналов:', error);
    return res.status(500).json({ error: 'Ошибка при получении сигналов' });
  }
};

// Получение сигналов по типу
export const getSignalsByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const signals = await Signal.findAll({
      where: { type },
      order: [['name', 'ASC']]
    });
    return res.status(200).json(signals);
  } catch (error) {
    console.error('Ошибка при получении сигналов по типу:', error);
    return res.status(500).json({ error: 'Ошибка при получении сигналов по типу' });
  }
};

// Создание нового сигнала
export const createSignal = async (req: Request, res: Response) => {
  try {
    const { name, type, description, totalCount, category, connectionType, voltage } = req.body;
    
    // Преобразуем тип сигнала к допустимому формату (AI, AO, DI, DO)
    let signalType = type.trim().toUpperCase();
    
    // Преобразование нестандартных типов в стандартные
    if (signalType === 'SNMP' || signalType === 'MODBUS' || signalType === 'TCP') {
      // Предполагаем, что это цифровой вход
      signalType = 'DI';
    } else if (!['AI', 'AO', 'DI', 'DO'].includes(signalType)) {
      // Если тип не соответствует стандартным, определяем по контексту
      if (signalType.includes('ANALOG') || signalType.includes('АНАЛОГ')) {
        signalType = signalType.includes('INPUT') || signalType.includes('ВХОД') ? 'AI' : 'AO';
      } else if (signalType.includes('DIGITAL') || signalType.includes('ЦИФР')) {
        signalType = signalType.includes('INPUT') || signalType.includes('ВХОД') ? 'DI' : 'DO';
      } else {
        // По умолчанию - цифровой вход
        signalType = 'DI';
      }
    }
    
    // Проверка, что тип сигнала допустим
    if (!['AI', 'AO', 'DI', 'DO'].includes(signalType)) {
      return res.status(400).json({ error: 'Недопустимый тип сигнала. Разрешены только AI, AO, DI, DO' });
    }
    
    // Проверка, что сигнал с таким именем и типом не существует
    const existingSignal = await Signal.findOne({
      where: {
        name,
        type: signalType
      }
    });
    
    if (existingSignal) {
      return res.status(400).json({ error: 'Сигнал с таким именем и типом уже существует' });
    }
    
    const signal = await Signal.create({
      name,
      type: signalType,
      description: description || '',
      totalCount: totalCount || 0,
      category,
      connectionType,
      voltage
    });
    
    return res.status(201).json(signal);
  } catch (error) {
    console.error('Ошибка при создании сигнала:', error);
    return res.status(500).json({ error: 'Ошибка при создании сигнала' });
  }
};

// Обновление сигнала
export const updateSignal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, description, totalCount, category, connectionType, voltage } = req.body;
    
    // Проверка, что тип сигнала допустим
    if (type && !['AI', 'AO', 'DI', 'DO'].includes(type)) {
      return res.status(400).json({ error: 'Недопустимый тип сигнала. Разрешены только AI, AO, DI, DO' });
    }
    
    const signal = await Signal.findByPk(id);
    
    if (!signal) {
      return res.status(404).json({ error: 'Сигнал не найден' });
    }
    
    // Проверка, не существует ли другой сигнал с таким же именем и типом
    if (name || type) {
      const existingSignal = await Signal.findOne({
        where: {
          name: name || signal.name,
          type: type || signal.type,
          id: { [Op.ne]: id }
        }
      });
      
      if (existingSignal) {
        return res.status(400).json({ error: 'Сигнал с таким именем и типом уже существует' });
      }
    }
    
    await signal.update({
      name: name || signal.name,
      type: type || signal.type,
      description: description !== undefined ? description : signal.description,
      totalCount: totalCount !== undefined ? totalCount : signal.totalCount,
      category: category !== undefined ? category : signal.category,
      connectionType: connectionType !== undefined ? connectionType : signal.connectionType,
      voltage: voltage !== undefined ? voltage : signal.voltage
    });
    
    return res.status(200).json(signal);
  } catch (error) {
    console.error('Ошибка при обновлении сигнала:', error);
    return res.status(500).json({ error: 'Ошибка при обновлении сигнала' });
  }
};

// Удаление сигнала
export const deleteSignal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const signal = await Signal.findByPk(id);
    
    if (!signal) {
      return res.status(404).json({ error: 'Сигнал не найден' });
    }
    
    // Удаление связанных записей
    await DeviceSignal.destroy({
      where: { signalId: id }
    });
    
    await signal.destroy();
    
    return res.status(200).json({ message: 'Сигнал успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении сигнала:', error);
    return res.status(500).json({ error: 'Ошибка при удалении сигнала' });
  }
};

// Назначение сигнала устройству
export const assignSignalToDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId, signalId, count } = req.body;
    
    console.log(`Назначение сигнала устройству: deviceId=${deviceId}, signalId=${signalId}, count=${count}`);
    
    // Преобразуем ID к числовому типу для надежности
    const numDeviceId = Number(deviceId);
    const numSignalId = Number(signalId);
    
    // Сначала пробуем найти устройство в таблице DeviceReference
    const deviceRef = await DeviceReference.findByPk(numDeviceId);
    console.log(`Поиск deviceRef с ID=${numDeviceId}: ${deviceRef ? 'найдено' : 'не найдено'}`);
    
    // Затем пробуем найти устройство в таблице Device
    let device = await Device.findByPk(numDeviceId);
    console.log(`Поиск device с ID=${numDeviceId}: ${device ? 'найдено' : 'не найдено'}`);
    
    // Если устройство есть в справочнике, но нет в основной таблице - создаем его
    if (!device && deviceRef) {
      console.log(`Создаем запись в таблице Device на основе DeviceReference с ID=${numDeviceId}`);
      
      // Создаем запись в таблице Device с тем же ID
      device = await Device.create({
        id: numDeviceId, // Важно: используем тот же ID
        systemCode: deviceRef.deviceType || 'Unknown',
        equipmentCode: 'Auto', 
        lineNumber: 'Auto',
        cabinetName: 'Auto',
        deviceDesignation: deviceRef.posDesignation,
        deviceType: deviceRef.deviceType,
        description: deviceRef.description || '',
        parentId: null
      });
      
      console.log(`Создана запись в Device с ID=${device.id}`);
    }
    
    const signal = await Signal.findByPk(numSignalId);
    console.log(`Поиск сигнала с ID=${numSignalId}: ${signal ? 'найден' : 'не найден'}`);
    
    if (!device && !deviceRef) {
      console.error(`Устройство с ID=${numDeviceId} не найдено ни в Device, ни в DeviceReference`);
      return res.status(404).json({ error: 'Устройство не найдено' });
    }
    
    if (!signal) {
      return res.status(404).json({ error: 'Сигнал не найден' });
    }
    
    // Используем ID устройства
    const actualDeviceId = device!.id;
    console.log(`Используем actualDeviceId=${actualDeviceId} для назначения сигнала`);
    
    // Проверка, не назначен ли сигнал уже устройству
    let deviceSignal = await DeviceSignal.findOne({
      where: {
        deviceId: actualDeviceId,
        signalId: numSignalId
      }
    });
    
    if (deviceSignal) {
      // Если назначение уже существует, обновляем его
      await deviceSignal.update({ count });
      console.log('Обновлено существующее назначение сигнала');
    } else {
      // Иначе создаем новое назначение
      deviceSignal = await DeviceSignal.create({
        deviceId: actualDeviceId,
        signalId: numSignalId,
        count
      });
      console.log('Создано новое назначение сигнала');
    }
    
    // Обновляем общее количество сигналов
    const totalCount = await DeviceSignal.sum('count', {
      where: { signalId: numSignalId }
    });
    
    await signal.update({ totalCount });
    
    return res.status(200).json(deviceSignal);
  } catch (error) {
    console.error('Ошибка при назначении сигнала устройству:', error);
    return res.status(500).json({ error: 'Ошибка при назначении сигнала устройству' });
  }
};

// Удаление назначения сигнала устройству
export const removeSignalFromDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId, signalId } = req.params;
    
    // Преобразуем ID к числовому типу для надежности
    const numDeviceId = Number(deviceId);
    const numSignalId = Number(signalId);
    
    console.log(`Удаление назначения сигнала: deviceId=${numDeviceId}, signalId=${numSignalId}`);
    
    // Проверяем существование устройства в основной таблице Device
    const device = await Device.findByPk(numDeviceId);
    
    // Если устройства нет в Device, проверяем в DeviceReference
    if (!device) {
      const deviceRef = await DeviceReference.findByPk(numDeviceId);
      if (!deviceRef) {
        return res.status(404).json({ error: 'Устройство не найдено' });
      }
    }
    
    const deviceSignal = await DeviceSignal.findOne({
      where: {
        deviceId: numDeviceId,
        signalId: numSignalId
      }
    });
    
    if (!deviceSignal) {
      return res.status(404).json({ error: 'Назначение не найдено' });
    }
    
    await deviceSignal.destroy();
    console.log(`Удалено назначение сигнала ${numSignalId} устройству ${numDeviceId}`);
    
    // Обновляем общее количество сигналов
    const signal = await Signal.findByPk(numSignalId);
    if (signal) {
      const totalCount = await DeviceSignal.sum('count', {
        where: { signalId: numSignalId }
      }) || 0;
      
      await signal.update({ totalCount });
      console.log(`Обновлено общее количество сигналов ${numSignalId}: ${totalCount}`);
    }
    
    return res.status(200).json({ message: 'Назначение успешно удалено' });
  } catch (error) {
    console.error('Ошибка при удалении назначения сигнала:', error);
    return res.status(500).json({ error: 'Ошибка при удалении назначения сигнала' });
  }
};

// Получение сводки по сигналам
export const getSignalsSummary = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    console.log(`getSignalsSummary: получаем сводку сигналов для проекта ${projectId || 'все'}`);
    
    if (projectId) {
      // Если указан проект, получаем сводку только по сигналам устройств этого проекта
      const signalsByType = await Signal.findAll({
        attributes: [
          'type', 
          [Sequelize.fn('SUM', Sequelize.col('deviceSignals.count')), 'totalCount']
        ],
        include: [
          {
            model: DeviceSignal,
            as: 'deviceSignals',
            attributes: [],
            required: true,
            include: [
              {
                model: DeviceReference,
                as: 'deviceReference',
                attributes: [],
                where: { projectId: parseInt(projectId as string, 10) },
                required: true
              }
            ]
          }
        ],
        group: ['Signal.type'],
        order: [['type', 'ASC']]
      });
      
      console.log(`getSignalsSummary: найдено ${signalsByType.length} типов сигналов для проекта ${projectId}`);
      return res.status(200).json(signalsByType);
    } else {
      // Если проект не указан, возвращаем сводку по всем сигналам
      const signalsByType = await Signal.findAll({
        attributes: ['type', [Sequelize.fn('SUM', Sequelize.col('totalCount')), 'totalCount']],
        group: ['type'],
        order: [['type', 'ASC']]
      });
      
      console.log(`getSignalsSummary: найдено ${signalsByType.length} типов сигналов (все проекты)`);
      return res.status(200).json(signalsByType);
    }
  } catch (error) {
    console.error('Ошибка при получении сводки по сигналам:', error);
    return res.status(500).json({ error: 'Ошибка при получении сводки по сигналам' });
  }
};

// Получение сигналов для конкретного устройства
export const getDeviceSignals = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const numDeviceId = Number(deviceId);
    
    console.log(`Получение сигналов устройства ${numDeviceId}`);
    
    // Проверяем существование устройства
    const deviceExists = await deviceExistsInAnyTable(numDeviceId);
    
    if (!deviceExists) {
      return res.status(404).json({ error: 'Устройство не найдено' });
    }
    
    const deviceSignals = await DeviceSignal.findAll({
      where: { deviceId: numDeviceId },
      include: [
        {
          model: Signal,
          as: 'signal'
        }
      ]
    });
    
    console.log(`Найдено ${deviceSignals.length} сигналов для устройства ${numDeviceId}`);
    
    return res.status(200).json(deviceSignals);
  } catch (error) {
    console.error('Ошибка при получении сигналов устройства:', error);
    return res.status(500).json({ error: 'Ошибка при получении сигналов устройства' });
  }
};

// Вспомогательная функция для проверки существования устройства в любой таблице
async function deviceExistsInAnyTable(deviceId: number): Promise<boolean> {
  const device = await Device.findByPk(deviceId);
  if (device) return true;
  
  const deviceRef = await DeviceReference.findByPk(deviceId);
  return !!deviceRef;
}

// Удаление всех сигналов
export const clearAllSignals = async (req: Request, res: Response) => {
  try {
    // Получаем текущее количество сигналов
    const countBefore = await Signal.count();
    console.log(`Найдено ${countBefore} сигналов для удаления`);
    
    // Удаляем все связи сигналов с устройствами
    await DeviceSignal.destroy({ 
      where: {},
      force: true
    });
    
    // Удаляем все сигналы
    await Signal.destroy({ 
      where: {},
      force: true
    });
    
    console.log(`Очищены все сигналы. Удалено ${countBefore} сигналов.`);
    
    res.status(200).json({ 
      success: true,
      message: 'Все сигналы успешно удалены', 
      deletedCount: countBefore 
    });
  } catch (error) {
    console.error('Ошибка при удалении сигналов:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка сервера при удалении сигналов',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}; 
