import { Request, Response } from 'express';
import path from 'path';
import { ImportService } from '../services/ImportService';

const resolveSafeFilePath = (baseDir: string, providedName: unknown): string | null => {
  if (typeof providedName !== 'string' || !providedName.trim()) {
    return null;
  }

  const normalizedName = providedName.trim();
  const basename = path.basename(normalizedName);
  if (basename !== normalizedName) {
    return null;
  }

  // Allow only a conservative set of characters in server-side temp file names.
  if (!/^[a-zA-Z0-9._-]+$/.test(basename)) {
    return null;
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedFile = path.resolve(baseDir, basename);
  if (!resolvedFile.startsWith(`${resolvedBase}${path.sep}`) && resolvedFile !== resolvedBase) {
    return null;
  }

  return resolvedFile;
};

export class ImportController {
  /**
   * Анализ CSV файла (получение заголовков)
   */
  static async analyzeFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Файл не найден' });
        return;
      }
      const filePath = req.file.path;

      // Пытаемся распарсить с запятой
      let result = await ImportService.analyzeCsvFile(filePath, ',');
      // Если найдена 1 или 0 колонок, возможно разделитель - точка с запятой
      if (result.headers.length <= 1) {
        const resultSemicolon = await ImportService.analyzeCsvFile(filePath, ';');
        if (resultSemicolon.headers.length > result.headers.length) {
          result = resultSemicolon;
        }
      }

      res.json({
        success: true,
        tempFileName: req.file.filename,
        headers: result.headers,
        sampleData: result.sampleData,
        totalRows: result.totalRows
      });
    } catch (error: any) {
      console.error('Ошибка в контроллере анализа файла:', error);
      res.status(500).json({
        success: false,
        message: `Ошибка при анализе: ${error.message}`
      });
    }
  }

  /**
   * Импорт данных КИП из CSV файла
   */
  static async importKip(req: Request, res: Response): Promise<void> {
    try {
      const { tempFileName } = req.body;
      let filePath = '';

      if (req.file) {
        filePath = req.file.path;
      } else if (tempFileName) {
        const safePath = resolveSafeFilePath(path.join(__dirname, '../../uploads'), tempFileName);
        if (!safePath) {
          res.status(400).json({ success: false, message: 'Некорректное имя файла' });
          return;
        }
        filePath = safePath;
      } else {
        res.status(400).json({ success: false, message: 'Файл не найден' });
        return;
      }

      let columnMap = {};
      if (req.body.columnMap) {
        try {
          columnMap = typeof req.body.columnMap === 'string' ? JSON.parse(req.body.columnMap) : req.body.columnMap;
        } catch (e) {
          console.warn('Ошибка парсинга columnMap', e);
        }
      }

      const { projectId } = req.query;
      const pid = projectId ? parseInt(projectId as string, 10) : 1;

      const result = await ImportService.importKipFromCsv(filePath, pid, columnMap);

      res.json(result);
    } catch (error: any) {
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
      const { tempFileName } = req.body;
      let filePath = '';

      if (req.file) {
        filePath = req.file.path;
      } else if (tempFileName) {
        const safePath = resolveSafeFilePath(path.join(__dirname, '../../uploads'), tempFileName);
        if (!safePath) {
          res.status(400).json({ success: false, message: 'Некорректное имя файла' });
          return;
        }
        filePath = safePath;
      } else {
        res.status(400).json({ success: false, message: 'Файл не найден' });
        return;
      }

      let columnMap = {};
      if (req.body.columnMap) {
        try {
          columnMap = typeof req.body.columnMap === 'string' ? JSON.parse(req.body.columnMap) : req.body.columnMap;
        } catch (e) {
          console.warn('Ошибка парсинга columnMap', e);
        }
      }

      const { projectId } = req.query;
      const pid = projectId ? parseInt(projectId as string, 10) : 1;

      const result = await ImportService.importZraFromCsv(filePath, pid, columnMap);

      res.json(result);
    } catch (error: any) {
      console.error('Ошибка в контроллере импорта ЗРА:', error);
      res.status(500).json({
        success: false,
        message: `Ошибка при импорте: ${error.message}`
      });
    }
  }

  /**
   * Импорт категорий сигналов из CSV файла
   */
  static async importSignalCategories(req: Request, res: Response): Promise<void> {
    try {
      const { tempFileName } = req.body;
      let filePath = '';

      if (req.file) {
        filePath = req.file.path;
      } else if (tempFileName) {
        const safePath = resolveSafeFilePath(path.join(__dirname, '../../uploads'), tempFileName);
        if (!safePath) {
          res.status(400).json({ success: false, message: 'Некорректное имя файла' });
          return;
        }
        filePath = safePath;
      } else {
        res.status(400).json({ success: false, message: 'Файл не найден' });
        return;
      }

      let columnMap = {};
      if (req.body.columnMap) {
        try {
          columnMap = typeof req.body.columnMap === 'string' ? JSON.parse(req.body.columnMap) : req.body.columnMap;
        } catch (e) {
          console.warn('Ошибка парсинга columnMap', e);
        }
      }

      const result = await ImportService.importSignalCategoriesFromCsv(filePath, columnMap);

      res.json(result);
    } catch (error: any) {
      console.error('Ошибка в контроллере импорта категорий сигналов:', error);
      res.status(500).json({
        success: false,
        message: `Ошибка при импорте: ${error.message}`
      });
    }
  }

  /**
   * Назначение сигналов устройствам по типу устройства
   */
  static async assignSignalsToDevicesByType(req: Request, res: Response): Promise<void> {
    try {
      const { deviceType } = req.params;
      const { projectId } = req.query;

      if (!deviceType) {
        res.status(400).json({ success: false, message: 'Не указан тип устройства' });
        return;
      }

      const pid = projectId ? parseInt(projectId as string, 10) : undefined;
      const result = await ImportService.assignSignalsToDevicesByType(deviceType, pid);

      res.json(result);
    } catch (error) {
      console.error('Ошибка в контроллере назначения сигналов:', error);
      res.status(500).json({
        success: false,
        message: `Ошибка при назначении сигналов: ${error.message}`
      });
    }
  }

  /**
   * Назначение сигналов всем типам устройств
   */
  static async assignSignalsToAllDeviceTypes(req: Request, res: Response): Promise<void> {
    try {
      console.log('Начато назначение сигналов всем типам устройств');
      const { projectId } = req.query;
      const pid = projectId ? parseInt(projectId as string, 10) : undefined;
      const result = await ImportService.assignSignalsToAllDeviceTypes(pid);

      res.json(result);
    } catch (error) {
      console.error('Ошибка в контроллере назначения сигналов всем типам устройств:', error);
      res.status(500).json({
        success: false,
        message: `Ошибка при назначении сигналов: ${error.message}`
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

      const filePath = resolveSafeFilePath(path.join(__dirname, '../../tmp'), fileName);
      if (!filePath) {
        res.status(400).json({ success: false, message: 'Некорректное имя файла' });
        return;
      }

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
