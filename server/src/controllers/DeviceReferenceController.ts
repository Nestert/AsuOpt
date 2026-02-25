import { Request, Response } from 'express';
import { DeviceReference } from '../models/DeviceReference';
import { Kip } from '../models/Kip';
import { Zra } from '../models/Zra';
import { Op } from 'sequelize';

export class DeviceReferenceController {
  // Получение всех устройств из справочника
  static async getAllDevices(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.query;
      console.log(`getAllDevices: получаем устройства для проекта ${projectId || 'все'}`);

      // Формируем условие фильтрации по проекту
      const whereCondition: any = {};
      if (projectId) {
        whereCondition.projectId = parseInt(projectId as string, 10);
      }

      // Получаем устройства с включением связанных данных KIP и ZRA
      const devices = await DeviceReference.findAll({
        where: whereCondition,
        order: [['posDesignation', 'ASC']],
        include: [
          {
            model: Kip,
            as: 'kip',
            required: false,
          },
          {
            model: Zra,
            as: 'zra',
            required: false,
          }
        ]
      });

      console.log(`getAllDevices: Получено ${devices.length} устройств`);

      // Для диагностики: подсчет устройств с данными KIP и ZRA
      const withKip = devices.filter(device => device.get('kip')).length;
      const withZra = devices.filter(device => device.get('zra')).length;
      console.log(`getAllDevices: С данными KIP: ${withKip}, с данными ZRA: ${withZra}`);

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

  // Удаление устройства по ID
  static async deleteDeviceById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      console.log(`Сервер: запрос на удаление устройства с id=${id}, IP:${req.ip}, метод:${req.method}`);

      // Получаем устройство из справочника для проверки существования
      const deviceRef = await DeviceReference.findByPk(id);

      if (!deviceRef) {
        console.log(`Сервер: устройство с id=${id} не найдено`);
        res.status(404).json({ message: 'Устройство не найдено' });
        return;
      }

      console.log(`Сервер: найдено устройство для удаления: ${deviceRef.posDesignation} (id=${id})`);

      // Начинаем транзакцию для обеспечения целостности данных
      const transaction = await DeviceReference.sequelize!.transaction();

      try {
        // Удаляем связанные данные КИП, если они есть
        const kipResult = await Kip.destroy({
          where: { deviceReferenceId: id },
          transaction
        });
        console.log(`Сервер: удалено записей КИП: ${kipResult}`);

        // Удаляем связанные данные ЗРА, если они есть
        const zraResult = await Zra.destroy({
          where: { deviceReferenceId: id },
          transaction
        });
        console.log(`Сервер: удалено записей ЗРА: ${zraResult}`);

        // Проверяем, есть ли связанные устройства в таблице Device
        try {
          const Device = require('../models/Device').Device;
          // Удаляем связи в таблице Device, если есть
          const deviceResult = await Device.destroy({
            where: {
              // Поиск по возможным ключам связи
              [Op.or]: [
                { deviceReferenceId: id },
                { referenceId: id }
              ]
            },
            transaction
          });
          console.log(`Сервер: удалено связанных устройств: ${deviceResult}`);
        } catch (devError) {
          console.log('Сервер: таблица Device не найдена или не содержит связей с этим устройством');
          console.log('Детали ошибки:', devError.message);
        }

        // Проверяем наличие других возможных связей
        try {
          // Получаем все модели из sequelize
          const models = DeviceReference.sequelize!.models;

          // Проходимся по всем моделям и ищем возможные связи с deviceReferenceId
          for (const modelName in models) {
            if (modelName !== 'DeviceReference' && modelName !== 'Kip' && modelName !== 'Zra' && modelName !== 'Device') {
              const model = models[modelName];
              // Проверяем, есть ли в модели поле deviceReferenceId
              if (model.rawAttributes && (model.rawAttributes.deviceReferenceId || model.rawAttributes.referenceId)) {
                const whereClause: any = {};

                if (model.rawAttributes.deviceReferenceId) {
                  whereClause.deviceReferenceId = id;
                } else if (model.rawAttributes.referenceId) {
                  whereClause.referenceId = id;
                }

                if (Object.keys(whereClause).length > 0) {
                  const deleteResult = await model.destroy({
                    where: whereClause,
                    transaction
                  });
                  console.log(`Сервер: удалено записей из таблицы ${modelName}: ${deleteResult}`);
                }
              }
            }
          }
        } catch (modelError) {
          console.log('Сервер: ошибка при поиске связей в других моделях:', modelError.message);
        }

        // Удаляем само устройство из справочника
        await deviceRef.destroy({ transaction });
        console.log(`Сервер: устройство с id=${id} успешно удалено`);

        // Подтверждаем транзакцию
        await transaction.commit();
        console.log(`Сервер: транзакция успешно завершена для id=${id}`);

        res.status(200).json({
          message: 'Устройство и связанные данные успешно удалены',
          id: id
        });
      } catch (txError) {
        // Если произошла ошибка, откатываем транзакцию
        await transaction.rollback();
        console.error('Сервер: ошибка при выполнении транзакции удаления:', txError);
        throw txError;
      }
    } catch (error) {
      console.error('Ошибка при удалении устройства:', error);
      res.status(500).json({
        message: 'Ошибка при удалении устройства',
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
      const { projectId } = req.query;
      console.log(`getDeviceTree: получаем дерево устройств для проекта ${projectId || 'все'}`);

      // Формируем условие фильтрации по проекту
      const whereCondition: any = {};
      if (projectId) {
        whereCondition.projectId = parseInt(projectId as string, 10);
      }

      // Группируем устройства по типу и первой части позиционного обозначения
      const devices = await DeviceReference.findAll({
        where: whereCondition,
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

  // Обновление данных устройства по ID
  static async updateDeviceReference(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Получаем устройство из справочника
      const deviceRef = await DeviceReference.findByPk(id);

      if (!deviceRef) {
        res.status(404).json({ message: 'Устройство не найдено' });
        return;
      }

      // Обновляем данные устройства
      await deviceRef.update(updateData);

      // Возвращаем обновленные данные
      res.json({
        message: 'Данные устройства успешно обновлены',
        device: deviceRef
      });
    } catch (error) {
      console.error('Ошибка при обновлении устройства:', error);
      res.status(500).json({
        message: 'Ошибка при обновлении устройства',
        error: error.message
      });
    }
  }

  // Очистка всех справочников устройств
  static async clearAllReferences(req: Request, res: Response): Promise<void> {
    try {
      console.log('Запрос на очистку справочников устройств');

      // Начинаем транзакцию
      const transaction = await DeviceReference.sequelize!.transaction();

      try {
        // Получаем количество записей для информации
        const kipCount = await Kip.count();
        const zraCount = await Zra.count();
        const refCount = await DeviceReference.count();

        // Сначала удаляем связанные данные КИП и ЗРА
        await Kip.destroy({ where: {}, force: true, transaction });
        await Zra.destroy({ where: {}, force: true, transaction });

        // Затем удаляем сами справочники
        await DeviceReference.destroy({ where: {}, force: true, transaction });

        // Подтверждаем транзакцию
        await transaction.commit();

        console.log(`Очищены справочники. Удалено: ${refCount} справочников, ${kipCount} записей КИП, ${zraCount} записей ЗРА`);

        res.status(200).json({
          message: 'Справочники устройств успешно очищены',
          deletedCounts: {
            references: refCount,
            kip: kipCount,
            zra: zraCount
          }
        });
      } catch (error) {
        // Откатываем транзакцию в случае ошибки
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Ошибка при очистке справочников устройств:', error);
      res.status(500).json({
        message: 'Ошибка при очистке справочников устройств',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Создание нового устройства
  static async createDeviceReference(req: Request, res: Response): Promise<void> {
    try {
      console.log('DeviceReferenceController: запрос на создание устройства, данные:', req.body);
      const { reference, kip, zra, dataType } = req.body;

      // Начинаем транзакцию
      const transaction = await DeviceReference.sequelize!.transaction();

      try {
        // Создаем запись в DeviceReference
        const deviceRef = await DeviceReference.create(reference, { transaction });
        console.log('DeviceReferenceController: создана запись в DeviceReference, id:', deviceRef.id);

        // В зависимости от типа данных создаем соответствующую запись
        if (dataType === 'kip' && kip) {
          // Добавляем id устройства в данные КИП
          const kipData = { ...kip, deviceReferenceId: deviceRef.id };
          await Kip.create(kipData, { transaction });
          console.log('DeviceReferenceController: создана запись в Kip');
        } else if (dataType === 'zra' && zra) {
          // Добавляем id устройства в данные ЗРА
          const zraData = { ...zra, deviceReferenceId: deviceRef.id };
          await Zra.create(zraData, { transaction });
          console.log('DeviceReferenceController: создана запись в Zra');
        }

        // Фиксируем транзакцию
        await transaction.commit();

        // Возвращаем полные данные устройства
        const fullDevice = {
          reference: deviceRef,
          kip: dataType === 'kip' ? await Kip.findOne({ where: { deviceReferenceId: deviceRef.id } }) : null,
          zra: dataType === 'zra' ? await Zra.findOne({ where: { deviceReferenceId: deviceRef.id } }) : null,
          dataType
        };

        res.status(201).json(fullDevice);
      } catch (error) {
        // Откатываем транзакцию в случае ошибки
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Ошибка при создании устройства:', error);
      res.status(500).json({
        message: 'Ошибка при создании устройства',
        error: error.message
      });
    }
  }

  // Получение устройств по списку ID
  static async getDevicesByIds(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ message: 'Необходимо указать массив ID устройств' });
        return;
      }

      // Получаем устройства из справочника
      const devices = await DeviceReference.findAll({
        where: { id: ids },
        include: [
          { model: Kip, as: 'kip', required: false },
          { model: Zra, as: 'zra', required: false }
        ]
      });

      // Формируем полные данные для каждого устройства
      const fullDevices = devices.map(device => ({
        reference: device,
        kip: (device as any).kip,
        zra: (device as any).zra,
        dataType: (device as any).kip ? 'kip' : ((device as any).zra ? 'zra' : 'unknown')
      }));

      res.json(fullDevices);
    } catch (error) {
      console.error('Ошибка при получении устройств по ID:', error);
      res.status(500).json({
        message: 'Ошибка при получении устройств',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Массовое обновление устройств
  static async batchUpdateDevices(req: Request, res: Response): Promise<void> {
    try {
      const { ids, updates, kipUpdates, zraUpdates } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ message: 'Необходимо указать массив ID устройств' });
        return;
      }

      console.log(`batchUpdateDevices: обновление ${ids.length} устройств`);
      console.log('Обновления reference:', updates);
      console.log('Обновления KIP:', kipUpdates);
      console.log('Обновления ZRA:', zraUpdates);

      // Начинаем транзакцию
      const transaction = await DeviceReference.sequelize!.transaction();

      try {
        let updatedCount = 0;

        // Обновляем данные reference для всех устройств
        if (updates && Object.keys(updates).length > 0) {
          const result = await DeviceReference.update(updates, {
            where: { id: ids },
            transaction
          });
          updatedCount += Array.isArray(result) ? result[0] : result;
        }

        // Обновляем данные KIP для устройств с типом KIP
        if (kipUpdates && Object.keys(kipUpdates).length > 0) {
          // Находим устройства с типом KIP
          const kipDevices = await DeviceReference.findAll({
            where: { id: ids },
            include: [{ model: Kip, as: 'kip', required: true }],
            transaction
          });

          for (const device of kipDevices) {
            const kipData = (device as any).kip;
            if (kipData) {
              await Kip.update(kipUpdates, {
                where: { id: kipData.id },
                transaction
              });
            }
          }
        }

        // Обновляем данные ZRA для устройств с типом ZRA
        if (zraUpdates && Object.keys(zraUpdates).length > 0) {
          // Находим устройства с типом ZRA
          const zraDevices = await DeviceReference.findAll({
            where: { id: ids },
            include: [{ model: Zra, as: 'zra', required: true }],
            transaction
          });

          for (const device of zraDevices) {
            const zraData = (device as any).zra;
            if (zraData) {
              await Zra.update(zraUpdates, {
                where: { id: zraData.id },
                transaction
              });
            }
          }
        }

        // Фиксируем транзакцию
        await transaction.commit();

        console.log(`batchUpdateDevices: успешно обновлено ${updatedCount} устройств`);

        res.json({
          success: true,
          updatedCount: ids.length,
          message: `Обновлено ${ids.length} устройств`
        });
      } catch (error) {
        // Откатываем транзакцию в случае ошибки
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Ошибка при массовом обновлении устройств:', error);
      res.status(500).json({
        message: 'Ошибка при массовом обновлении устройств',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Удаление дубликатов устройств (с одинаковым posDesignation)
  static async removeDuplicates(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.query;
      console.log(`removeDuplicates: удаление дубликатов для проекта ${projectId || 'все'}`);

      const whereCondition: any = {};
      if (projectId) {
        whereCondition.projectId = parseInt(projectId as string, 10);
      }

      // Получаем все устройства
      const devices = await DeviceReference.findAll({
        where: whereCondition,
        include: [
          { model: Kip, as: 'kip', required: false },
          { model: Zra, as: 'zra', required: false }
        ]
      });

      // Группируем по Обозначению (posDesignation)
      // Если Обозначение пустое, устройство не считается дубликатом
      const groupedByDesc = new Map<string, typeof devices>();
      devices.forEach(device => {
        if (!device.posDesignation) return; // пропускаем пустые обозначения

        const key = `${device.projectId}_${device.posDesignation.trim().toLowerCase()}`;
        if (!groupedByDesc.has(key)) {
          groupedByDesc.set(key, []);
        }
        groupedByDesc.get(key)!.push(device);
      });

      const idsToDelete: number[] = [];

      // Для каждой группы
      for (const [key, group] of Array.from(groupedByDesc.entries())) {
        if (group.length > 1) {
          // Сортируем так, чтобы в начале были устройства с данными КИП или ЗРА, затем по id (старые)
          group.sort((a, b) => {
            const aHasData = (a as any).kip || (a as any).zra ? 1 : 0;
            const bHasData = (b as any).kip || (b as any).zra ? 1 : 0;
            if (aHasData !== bHasData) return bHasData - aHasData;
            return a.id - b.id;
          });

          // Оставляем первый элемент (индекс 0), остальные помечаем на удаление
          for (let i = 1; i < group.length; i++) {
            idsToDelete.push(group[i].id);
          }
        }
      }

      if (idsToDelete.length === 0) {
        res.json({ message: 'Дубликаты не найдены', count: 0 });
        return;
      }

      console.log(`removeDuplicates: найдено ${idsToDelete.length} дубликатов для удаления.`);

      // Начинаем транзакцию для безопасного удаления
      const transaction = await DeviceReference.sequelize!.transaction();

      try {
        // Удаляем связанные данные
        const kipDeleted = await Kip.destroy({ where: { deviceReferenceId: { [Op.in]: idsToDelete } }, transaction });
        const zraDeleted = await Zra.destroy({ where: { deviceReferenceId: { [Op.in]: idsToDelete } }, transaction });

        console.log(`removeDuplicates: удалено связанных записей КИП=${kipDeleted}, ЗРА=${zraDeleted}`);

        // Ищем связи в таблице Device
        try {
          const Device = require('../models/Device').Device;
          await Device.destroy({
            where: {
              [Op.or]: [
                { deviceReferenceId: { [Op.in]: idsToDelete } },
                { referenceId: { [Op.in]: idsToDelete } }
              ]
            },
            transaction
          });
        } catch (devError: any) {
          console.log('removeDuplicates: таблица Device не найдена или не содержит связей');
        }

        // Проверяем наличие других возможных связей
        try {
          const models = DeviceReference.sequelize!.models;
          for (const modelName in models) {
            if (modelName !== 'DeviceReference' && modelName !== 'Kip' && modelName !== 'Zra' && modelName !== 'Device') {
              const model = models[modelName];
              if (model.rawAttributes && (model.rawAttributes.deviceReferenceId || model.rawAttributes.referenceId)) {
                const whereClause: any = {};
                if (model.rawAttributes.deviceReferenceId) {
                  whereClause.deviceReferenceId = { [Op.in]: idsToDelete };
                } else if (model.rawAttributes.referenceId) {
                  whereClause.referenceId = { [Op.in]: idsToDelete };
                }
                if (Object.keys(whereClause).length > 0) {
                  await model.destroy({ where: whereClause, transaction });
                }
              }
            }
          }
        } catch (modelError: any) {
          console.log('removeDuplicates: ошибка при очистке связей в других моделях:', modelError.message);
        }

        // Удаляем дубликаты из основного справочника
        const deletedCount = await DeviceReference.destroy({
          where: { id: { [Op.in]: idsToDelete } },
          transaction
        });

        // Подтверждаем транзакцию
        await transaction.commit();

        res.json({
          message: 'Дубликаты успешно удалены',
          count: deletedCount
        });

      } catch (error) {
        await transaction.rollback();
        console.error('removeDuplicates: ошибка транзакции:', error);
        throw error;
      }

    } catch (error: any) {
      console.error('Ошибка при удалении дубликатов:', error);
      res.status(500).json({
        message: 'Ошибка при удалении дубликатов',
        error: error.message
      });
    }
  }
} 