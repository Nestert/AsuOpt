import { Request, Response } from 'express';
import path from 'path';
import { ImportService } from '../services/ImportService';

export class ImportController {
  /**
   * Импорт данных КИП из CSV файла
   */
  static async importKip(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Файл не найден' });
        return;
      }
      
      const filePath = req.file.path;
      const result = await ImportService.importKipFromCsv(filePath);
      
      res.json(result);
    } catch (error) {
      console.error('Ошибка в контроллере импорта КИП:', error);
      res.status(500).json({
        success: false,
        message: `Ошибка при импорте: ${error.message}`
      });
    }
  }
  
  /**
   * Импорт данных ЗРА из CSV файла
   */
  static async importZra(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Файл не найден' });
        return;
      }
      
      const filePath = req.file.path;
      const result = await ImportService.importZraFromCsv(filePath);
      
      res.json(result);
    } catch (error) {
      console.error('Ошибка в контроллере импорта ЗРА:', error);
      res.status(500).json({
        success: false,
        message: `Ошибка при импорте: ${error.message}`
      });
    }
  }
  
  /**
   * Импорт файлов из временной директории
   */
  static async importFromTemp(req: Request, res: Response): Promise<void> {
    try {
      const { fileName, type } = req.body;
      
      if (!fileName || !type) {
        res.status(400).json({ success: false, message: 'Не указан файл или тип импорта' });
        return;
      }
      
      const filePath = path.join(__dirname, '../../tmp', fileName);
      
      let result;
      if (type === 'kip') {
        result = await ImportService.importKipFromCsv(filePath);
      } else if (type === 'zra') {
        result = await ImportService.importZraFromCsv(filePath);
      } else {
        res.status(400).json({ success: false, message: 'Неверный тип импорта' });
        return;
      }
      
      res.json(result);
    } catch (error) {
      console.error('Ошибка в контроллере импорта из tmp:', error);
      res.status(500).json({
        success: false,
        message: `Ошибка при импорте: ${error.message}`
      });
    }
  }
  
  /**
   * Получение статистики по импорту
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await ImportService.getImportStats();
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Ошибка при получении статистики:', error);
      res.status(500).json({
        success: false,
        message: `Ошибка при получении статистики: ${error.message}`
      });
    }
  }
} 