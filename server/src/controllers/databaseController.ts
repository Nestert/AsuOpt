import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { Device } from '../models/Device';
import { DeviceReference } from '../models/DeviceReference';
import { DeviceSignal } from '../models/DeviceSignal';
import { DeviceTypeSignal } from '../models/DeviceTypeSignal';
import { Kip } from '../models/Kip';
import { Signal } from '../models/Signal';
import { Zra } from '../models/Zra';
import { QueryTypes } from 'sequelize';

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
      let result;
      
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
            
            result = await Signal.destroy({ where: {}, force: true });
            break;
            
          case 'device_signals':
            countBefore = await DeviceSignal.count();
            result = await DeviceSignal.destroy({ where: {}, force: true });
            break;
            
          case 'device_type_signals':
            countBefore = await DeviceTypeSignal.count();
            result = await DeviceTypeSignal.destroy({ where: {}, force: true });
            break;
            
          case 'devices':
            countBefore = await Device.count();
            
            // Сначала удаляем связанные записи DeviceSignal
            const deviceSignalsForDevices = await DeviceSignal.count();
            if (deviceSignalsForDevices > 0) {
              console.log(`Удаляем ${deviceSignalsForDevices} связанных записей из device_signals`);
              await DeviceSignal.destroy({ where: {}, force: true });
            }
            
            result = await Device.destroy({ where: {}, force: true });
            break;
            
          case 'device_references':
            countBefore = await DeviceReference.count();
            result = await DeviceReference.destroy({ where: {}, force: true });
            break;
            
          case 'kips':
            countBefore = await Kip.count();
            result = await Kip.destroy({ where: {}, force: true });
            break;
            
          case 'zras':
            countBefore = await Zra.count();
            result = await Zra.destroy({ where: {}, force: true });
            break;
            
          case 'signal_categories':
            // Для signal_categories используем прямой SQL запрос
            try {
              // Получаем количество записей перед удалением
              const countResult = await sequelize.query(
                "SELECT COUNT(*) as count FROM signal_categories;",
                { type: QueryTypes.SELECT }
              );
              
              countBefore = (countResult[0] as any)?.count || 0;
              
              // Удаляем все записи из таблицы
              await sequelize.query(`DELETE FROM signal_categories;`);
              
              // Сбрасываем автоинкремент
              await sequelize.query(`DELETE FROM sqlite_sequence WHERE name='signal_categories';`);
              
              result = true;
              console.log(`Таблица signal_categories очищена. Удалено ${countBefore} записей.`);
            } catch (error) {
              console.error(`Ошибка при очистке таблицы signal_categories:`, error);
              throw error;
            }
            break;
            
          default:
            // Безопасный вариант через SQL запрос
            try {
              // Получаем список таблиц
              const tables = await sequelize.query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
                { type: QueryTypes.SELECT }
              );
              
              // Проверяем, существует ли таблица
              const tableExists = tables.some((table: any) => table.name === tableName);
              
              if (!tableExists) {
                throw new Error(`Таблица ${tableName} не найдена`);
              }
              
              // Получаем количество записей
              const countQuery = await sequelize.query(
                `SELECT COUNT(*) as count FROM ${tableName};`,
                { type: QueryTypes.SELECT }
              );
              
              countBefore = (countQuery[0] as any)?.count || 0;
              
              // Очищаем таблицу
              await sequelize.query(`DELETE FROM ${tableName};`);
              
              // Сбрасываем автоинкремент
              await sequelize.query(`DELETE FROM sqlite_sequence WHERE name='${tableName}';`);
              
              result = true;
            } catch (error) {
              console.error(`Ошибка при очистке таблицы ${tableName}:`, error);
              throw error;
            }
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
        tables: tables.map((table: any) => table.name)
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