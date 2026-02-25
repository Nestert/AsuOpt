import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { Device } from '../models/Device';
import { DeviceReference } from '../models/DeviceReference';
import { DeviceSignal } from '../models/DeviceSignal';
import { Kip } from '../models/Kip';
import { Project } from '../models/Project';
import { Signal } from '../models/Signal';
import { User } from '../models/User';
import { Zra } from '../models/Zra';
import { QueryTypes } from 'sequelize';

type CountRow = { count: number | string };

const getCountValue = (rows: CountRow[]): number => {
  const raw = rows[0]?.count ?? 0;
  const count = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(count) ? count : 0;
};

const tableExists = async (tableName: string): Promise<boolean> => {
  const rows = await sequelize.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = :tableName;",
    {
      type: QueryTypes.SELECT,
      replacements: { tableName },
    }
  );

  return rows.length > 0;
};

const resetSqliteSequence = async (tableName: string): Promise<void> => {
  const sqliteSequenceExists = await tableExists('sqlite_sequence');
  if (!sqliteSequenceExists) {
    return;
  }

  await sequelize.query('DELETE FROM sqlite_sequence WHERE name = :tableName;', {
    replacements: { tableName },
  });
};

const clearRawAllowlistedTable = async (tableName: 'signal_categories' | 'device_type_signals'): Promise<number> => {
  if (!(await tableExists(tableName))) {
    return 0;
  }

  let countRows: CountRow[] = [];

  if (tableName === 'signal_categories') {
    countRows = await sequelize.query<CountRow>('SELECT COUNT(*) as count FROM signal_categories;', {
      type: QueryTypes.SELECT,
    });
    await sequelize.query('DELETE FROM signal_categories;');
  } else {
    countRows = await sequelize.query<CountRow>('SELECT COUNT(*) as count FROM device_type_signals;', {
      type: QueryTypes.SELECT,
    });
    await sequelize.query('DELETE FROM device_type_signals;');
  }

  const countBefore = getCountValue(countRows);
  await resetSqliteSequence(tableName);
  return countBefore;
};

/**
 * Контроллер для управления отдельными таблицами базы данных
 */
export class DatabaseController {
  /**
   * Очистка конкретной таблицы
   */
  static async clearTable(req: Request, res: Response): Promise<void> {
    const { tableName } = req.params;
    
    if (!tableName) {
      res.status(400).json({
        success: false,
        message: 'Не указано имя таблицы'
      });
      return;
    }
    
    try {
      console.log(`Запрос на очистку таблицы ${tableName}`);
      
      let countBefore = 0;
      
      // Отключаем внешние ключи перед любыми операциями удаления
      await sequelize.query('PRAGMA foreign_keys = OFF;');
      
      try {
        switch (tableName) {
          case 'signals':
            countBefore = await Signal.count();
            
            // Сначала удаляем связанные записи DeviceSignal
            const deviceSignalsCount = await DeviceSignal.count();
            if (deviceSignalsCount > 0) {
              console.log(`Удаляем ${deviceSignalsCount} связанных записей из device_signals`);
              await DeviceSignal.destroy({ where: {}, force: true });
            }
            
            await Signal.destroy({ where: {}, force: true });
            await resetSqliteSequence('signals');
            break;
            
          case 'device_signals':
            countBefore = await DeviceSignal.count();
            await DeviceSignal.destroy({ where: {}, force: true });
            await resetSqliteSequence('device_signals');
            break;
            
          case 'device_type_signals':
            countBefore = await clearRawAllowlistedTable('device_type_signals');
            break;
            
          case 'devices':
            countBefore = await Device.count();
            
            // Сначала удаляем связанные записи DeviceSignal
            const deviceSignalsForDevices = await DeviceSignal.count();
            if (deviceSignalsForDevices > 0) {
              console.log(`Удаляем ${deviceSignalsForDevices} связанных записей из device_signals`);
              await DeviceSignal.destroy({ where: {}, force: true });
            }
            
            await Device.destroy({ where: {}, force: true });
            await resetSqliteSequence('devices');
            break;
            
          case 'device_references':
            countBefore = await DeviceReference.count();
            await DeviceReference.destroy({ where: {}, force: true });
            await resetSqliteSequence('device_references');
            break;
            
          case 'kips':
            countBefore = await Kip.count();
            await Kip.destroy({ where: {}, force: true });
            await resetSqliteSequence('kips');
            break;
            
          case 'zras':
            countBefore = await Zra.count();
            await Zra.destroy({ where: {}, force: true });
            await resetSqliteSequence('zras');
            break;

          case 'projects':
            countBefore = await Project.count();
            await Project.destroy({ where: {}, force: true });
            await resetSqliteSequence('projects');
            break;

          case 'users':
            countBefore = await User.count();
            await User.destroy({ where: {}, force: true });
            await resetSqliteSequence('users');
            break;
            
          case 'signal_categories':
            countBefore = await clearRawAllowlistedTable('signal_categories');
            break;
            
          default:
            res.status(400).json({
              success: false,
              message: `Очистка таблицы ${tableName} не поддерживается`,
            });
            return;
        }
      } finally {
        // Включаем внешние ключи в любом случае
        await sequelize.query('PRAGMA foreign_keys = ON;');
      }
      
      console.log(`Таблица ${tableName} очищена. Удалено ${countBefore} записей.`);
      
      res.status(200).json({
        success: true,
        message: `Таблица ${tableName} успешно очищена`,
        deletedCount: countBefore
      });
    } catch (error) {
      console.error(`Ошибка при очистке таблицы ${tableName}:`, error);
      res.status(500).json({
        success: false,
        message: `Ошибка при очистке таблицы ${tableName}`,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Получение списка всех таблиц
   */
  static async getAllTables(req: Request, res: Response): Promise<void> {
    try {
      // Получаем список таблиц через SQL запрос
      const tables = await sequelize.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
        { type: QueryTypes.SELECT }
      );
      
      res.status(200).json({
        success: true,
        tables: (tables as Array<{ name: string }>).map((table) => table.name)
      });
    } catch (error) {
      console.error('Ошибка при получении списка таблиц:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении списка таблиц',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
} 
