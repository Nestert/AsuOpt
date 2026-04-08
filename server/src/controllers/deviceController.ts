import { Request, Response } from 'express';
import { Device } from '../models/Device';
import { Op, Sequelize } from 'sequelize';
import { ApiError } from '../errors/ApiError';

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
  const { projectId, lazy = 'true' } = req.query;
  const whereClause: any = { parentId: null };
  if (projectId) {
    whereClause.projectId = Number(projectId);
  }

  let rootDevices;

  if (lazy === 'true') {
    rootDevices = await Device.findAll({
      where: whereClause,
      order: [['createdAt', 'ASC']]
    });

    const parentIds = rootDevices.map(d => d.id);
    const childrenCounts = parentIds.length > 0
      ? await Device.findAll({
          attributes: ['parentId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
          where: { parentId: parentIds },
          group: ['parentId'],
          raw: true,
        }) as unknown as Array<{ parentId: number; count: number }>
      : [];
    const countMap = new Map(childrenCounts.map(r => [r.parentId, Number(r.count)]));
    for (const device of rootDevices) {
      (device as any).childrenCount = countMap.get(device.id) ?? 0;
    }
  } else {
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

  res.status(200).json(rootDevices);
};

// Получить все устройства (плоский список) с пагинацией
export const getAllDevices = async (req: Request, res: Response) => {
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
};

// Получить устройство по ID
export const getDeviceById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const device = await Device.findByPk(id, {
    include: [
      { model: Device, as: 'children' },
      { model: Device, as: 'parent' }
    ]
  });

  if (!device) {
    throw new ApiError(404, 'NOT_FOUND', 'Устройство не найдено');
  }

  res.status(200).json(device);
};

// Создать новое устройство
export const createDevice = async (req: Request, res: Response) => {
  const newDevice = await Device.create(req.body);
  res.status(201).json(newDevice);
};

// Обновить устройство
export const updateDevice = async (req: Request, res: Response) => {
  const { id } = req.params;

  const device = await Device.findByPk(id);
  if (!device) {
    throw new ApiError(404, 'NOT_FOUND', 'Устройство не найдено');
  }

  await device.update(req.body);
  res.status(200).json(device);
};

// Удалить устройство
export const deleteDevice = async (req: Request, res: Response) => {
  const { id } = req.params;

  const device = await Device.findByPk(id);
  if (!device) {
    throw new ApiError(404, 'NOT_FOUND', 'Устройство не найдено');
  }

  await device.destroy();
  res.status(200).json({ message: 'Устройство успешно удалено' });
};

// Очистить базу данных устройств
export const clearAllDevices = async (req: Request, res: Response) => {
  const countBefore = await Device.count();
  const transaction = await Device.sequelize!.transaction();
  try {
    await Device.destroy({ where: {}, force: true, transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
  res.status(200).json({ message: 'База данных успешно очищена', deletedCount: countBefore });
};

// Получить дочерние устройства по ID родителя
export const getDeviceChildren = async (req: Request, res: Response) => {
  const { parentId } = req.params;
  const { projectId, lazy = 'true' } = req.query;

  const whereClause: any = { parentId: Number(parentId) };
  if (projectId) {
    whereClause.projectId = Number(projectId);
  }

  let children;

  if (lazy === 'true') {
    children = await Device.findAll({
      where: whereClause,
      order: [['createdAt', 'ASC']]
    });

    const parentIds = children.map(d => d.id);
    const childrenCounts = parentIds.length > 0
      ? await Device.findAll({
          attributes: ['parentId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
          where: { parentId: parentIds },
          group: ['parentId'],
          raw: true,
        }) as unknown as Array<{ parentId: number; count: number }>
      : [];
    const countMap = new Map(childrenCounts.map(r => [r.parentId, Number(r.count)]));
    for (const device of children) {
      (device as any).childrenCount = countMap.get(device.id) ?? 0;
    }
  } else {
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
};

// Поиск устройств по параметрам с пагинацией
export const searchDevices = async (req: Request, res: Response) => {
  const { query, page = 1, limit = 50, projectId } = req.query;

  if (!query) {
    throw new ApiError(400, 'BAD_REQUEST', 'Необходимо указать параметр query для поиска');
  }

  const offset = (Number(page) - 1) * Number(limit);
  const searchQuery = `%${query}%`;

  const whereClause: any = {
    [Op.or]: [
      { systemCode: { [Op.like]: searchQuery } },
      { equipmentCode: { [Op.like]: searchQuery } },
      { deviceDesignation: { [Op.like]: searchQuery } },
      { deviceType: { [Op.like]: searchQuery } },
      { description: { [Op.like]: searchQuery } },
      { lineNumber: { [Op.like]: searchQuery } },
      { cabinetName: { [Op.like]: searchQuery } }
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
};