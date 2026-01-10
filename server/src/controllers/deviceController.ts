import { Request, Response } from 'express';
import { Device } from '../models/Device';
import { Op } from 'sequelize';

/**
 * @swagger
 * tags:
 *   - name: Devices
 *     description: Управление устройствами
 * /api/devices/tree:
 *   get:
 *     summary: Получить иерархическую структуру устройств (оптимизированная с ленивой загрузкой)
 *     tags: [Devices]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *         description: ID проекта для фильтрации
 *       - in: query
 *         name: lazy
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Использовать ленивую загрузку (true) или полную загрузку (false)
 *     responses:
 *       200:
 *         description: Иерархическая структура устройств
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 description: Узел дерева устройств
 * /api/devices:
 *   get:
 *     summary: Получить список всех устройств с пагинацией
 *     tags: [Devices]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *         description: ID проекта для фильтрации
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Количество элементов на странице
 *     responses:
 *       200:
 *         description: Список устройств с пагинацией
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 devices:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Device'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *   post:
 *     summary: Создать новое устройство
 *     tags: [Devices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Device'
 *     responses:
 *       201:
 *         description: Устройство создано
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Device'
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * /api/devices/{id}:
 *   get:
 *     summary: Получить устройство по ID
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID устройства
 *     responses:
 *       200:
 *         description: Информация об устройстве
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Device'
 *       404:
 *         description: Устройство не найдено
 *   put:
 *     summary: Обновить устройство
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID устройства
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Device'
 *     responses:
 *       200:
 *         description: Устройство обновлено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Device'
 *       404:
 *         description: Устройство не найдено
 *   delete:
 *     summary: Удалить устройство
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID устройства
 *     responses:
 *       200:
 *         description: Устройство удалено
 *       404:
 *         description: Устройство не найдено
 * /api/devices/{parentId}/children:
 *   get:
 *     summary: Получить дочерние устройства по ID родителя
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID родительского устройства
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *         description: ID проекта для фильтрации
 *       - in: query
 *         name: lazy
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Использовать ленивую загрузку (true) или полную загрузку (false)
 *     responses:
 *       200:
 *         description: Список дочерних устройств
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Device'
 */

// Получить иерархическую структуру устройств (оптимизированная версия с ленивой загрузкой)
export const getDeviceTree = async (req: Request, res: Response) => {
  try {
    console.log('Запрос на получение дерева устройств');

    const { projectId, lazy = 'true' } = req.query;
    const whereClause: any = { parentId: null };
    if (projectId) {
      whereClause.projectId = Number(projectId);
    }

    let rootDevices;

    if (lazy === 'true') {
      // Ленивая загрузка: получаем только корневые устройства без детей
      rootDevices = await Device.findAll({
        where: whereClause,
        order: [['createdAt', 'ASC']]
      });

      // Добавляем поле childrenCount для UI
      for (const device of rootDevices) {
        const childrenCount = await Device.count({
          where: { parentId: device.id }
        });
        (device as any).childrenCount = childrenCount;
      }
    } else {
      // Полная загрузка для совместимости (если lazy=false)
      rootDevices = await Device.findAll({
        where: whereClause,
        include: [
          {
            model: Device,
            as: 'children',
            include: [{ all: true, nested: true }]
          }
        ],
        order: [['createdAt', 'ASC']]
      });
    }

    console.log(`Получено корневых устройств: ${rootDevices.length}`);

    // Проверяем если список пуст, выводим диагностическую информацию
    if (rootDevices.length === 0) {
      const allDevices = await Device.findAll();
      console.log(`Всего устройств в базе: ${allDevices.length}`);

      // Если нет корневых устройств, но есть устройства в базе,
      // возможно у них не установлен parentId в null явно
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
      const updatedRootDevices = lazy === 'true' ?
        await Device.findAll({
          where: whereClause,
          order: [['createdAt', 'ASC']]
        }) :
        await Device.findAll({
          where: whereClause,
          include: [
            {
              model: Device,
              as: 'children',
              include: [{ all: true, nested: true }]
            }
          ],
          order: [['createdAt', 'ASC']]
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

// Получить все устройства (плоский список) с пагинацией
export const getAllDevices = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, projectId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {};
    if (projectId) {
      whereClause.projectId = Number(projectId);
    }

    const { count, rows } = await Device.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      devices: rows,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit))
      }
    });
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

// Получить дочерние устройства по ID родителя
export const getDeviceChildren = async (req: Request, res: Response) => {
  try {
    const { parentId } = req.params;
    const { projectId, lazy = 'true' } = req.query;

    const whereClause: any = { parentId: Number(parentId) };
    if (projectId) {
      whereClause.projectId = Number(projectId);
    }

    let children;

    if (lazy === 'true') {
      // Ленивая загрузка дочерних устройств
      children = await Device.findAll({
        where: whereClause,
        order: [['createdAt', 'ASC']]
      });

      // Добавляем childrenCount для каждого ребенка
      for (const device of children) {
        const childrenCount = await Device.count({
          where: { parentId: device.id }
        });
        (device as any).childrenCount = childrenCount;
      }
    } else {
      // Рекурсивная загрузка для совместимости
      children = await Device.findAll({
        where: whereClause,
        include: [
          {
            model: Device,
            as: 'children',
            include: [{ all: true, nested: true }]
          }
        ],
        order: [['createdAt', 'ASC']]
      });
    }

    res.status(200).json(children);
  } catch (error) {
    console.error('Ошибка при получении дочерних устройств:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении дочерних устройств' });
  }
};

// Поиск устройств по параметрам с пагинацией
export const searchDevices = async (req: Request, res: Response) => {
  try {
    const { query, page = 1, limit = 50, projectId } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Необходимо указать параметр query для поиска' });
    }

    const offset = (Number(page) - 1) * Number(limit);
    const searchQuery = `%${query}%`;

    const whereClause: any = {
      [Op.or]: [
        { systemCode: { [Op.iLike]: searchQuery } },
        { equipmentCode: { [Op.iLike]: searchQuery } },
        { deviceDesignation: { [Op.iLike]: searchQuery } },
        { deviceType: { [Op.iLike]: searchQuery } },
        { description: { [Op.iLike]: searchQuery } },
        { lineNumber: { [Op.iLike]: searchQuery } },
        { cabinetName: { [Op.iLike]: searchQuery } }
      ]
    };

    if (projectId) {
      whereClause.projectId = Number(projectId);
    }

    const { count, rows } = await Device.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      devices: rows,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Ошибка при поиске устройств:', error);
    res.status(500).json({ message: 'Ошибка сервера при поиске устройств' });
  }
};