import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import csv from 'csv-parser';
import { Device } from '../models/Device';
import { Op } from 'sequelize';

// Функция импорта файла (Excel или CSV)
export const importFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Файл не был загружен' });
      return;
    }

    const originalFileName = req.file.originalname.toLowerCase();
    const filePath = req.file.path;

    console.log('Оригинальное имя файла:', originalFileName);
    console.log('Путь к сохраненному файлу:', filePath);

    const fileExtension = path.extname(originalFileName).toLowerCase();

    // Специальная обработка для файла @zra.csv
    if (originalFileName === '@zra.csv' || originalFileName.includes('zra.csv')) {
      console.log('Обнаружен специальный файл @zra.csv, применяю специальную обработку');
      await importFromZraCsv(filePath, res);
      return;
    }

    if (fileExtension === '.csv') {
      await importFromCsv(filePath, res);
    } else if (['.xlsx', '.xls'].includes(fileExtension)) {
      await importFromExcel(filePath, res);
    } else {
      res.status(400).json({ message: 'Неподдерживаемый формат файла' });
    }
  } catch (error) {
    console.error('Ошибка при импорте файла:', error);
    res.status(500).json({ message: 'Ошибка сервера при импорте файла' });
  }
};

// Функция для импорта из Excel файла
const importFromExcel = async (filePath: string, res: Response): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const worksheet = workbook.getWorksheet(1);
  const devices: any[] = [];
  
  if (!worksheet) {
    res.status(400).json({ error: 'Не найден лист с данными' });
    return;
  }
  
  // Получаем заголовки
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell) => {
    headers.push(cell.value ? cell.value.toString() : '');
  });
  
  // Проверяем наличие обязательных полей
  const requiredFields = ['Код системы', 'Код оборудования', 'Тип устройства'];
  const missingFields = requiredFields.filter(field => !headers.some(header => 
    header.toLowerCase().includes(field.toLowerCase())
  ));
  
  if (missingFields.length > 0) {
    res.status(400).json({ error: `Отсутствуют обязательные поля: ${missingFields.join(', ')}` });
    return;
  }
  
  // Маппинг заголовков к полям модели
  const headerMapping: {[key: string]: string} = {
    'Код системы': 'systemCode',
    'Код оборудования': 'equipmentCode',
    'Номер линии': 'lineNumber',
    'Имя шкафа': 'cabinetName',
    'Обозначение устройства': 'deviceDesignation',
    'Тип устройства': 'deviceType',
    'Описание': 'description',
    'ID родителя': 'parentId'
  };
  
  // Проходим по строкам и извлекаем данные
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Пропускаем заголовки
    
    const device: {[key: string]: any} = {
      systemCode: '',
      equipmentCode: '',
      lineNumber: '',
      cabinetName: '',
      deviceDesignation: '',
      deviceType: '',
      description: ''
    };
    
    headers.forEach((header, colIndex) => {
      for (const [key, value] of Object.entries(headerMapping)) {
        if (header.toLowerCase().includes(key.toLowerCase())) {
          const cellValue = row.getCell(colIndex + 1).value;
          device[value] = cellValue ? cellValue.toString() : '';
          break;
        }
      }
    });
    
    // Проверяем наличие обязательных полей
    if (device.systemCode && device.equipmentCode && device.deviceType) {
      devices.push(device);
    }
  });
  
  // Проверяем наличие устройств для импорта
  if (devices.length === 0) {
    res.status(400).json({ error: 'Нет данных для импорта' });
    return;
  }
  
  // Сохраняем устройства в базу данных
  const result = await saveDevicesToDatabase(devices);
  
  // Удаляем временный файл
  fs.unlinkSync(filePath);
  
  res.status(200).json(result);
};

// Функция для импорта из CSV файла
const importFromCsv = async (filePath: string, res: Response): Promise<void> => {
  const results: any[] = [];
  const errors: string[] = [];
  const successCount = { created: 0, updated: 0 };

  console.log('Начало импорта из CSV:', filePath);

  try {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        console.log(`Прочитано строк из CSV: ${results.length}`);
        
        // Проверка структуры файла
        if (results.length === 0) {
          return res.status(400).json({ message: 'Файл не содержит данных' });
        }

        for (const row of results) {
          try {
            // Маппинг полей из CSV в модель Device
            const deviceData = {
              systemCode: row['Код системы'] || 'Неизвестная система',
              equipmentCode: row['Код оборудования'] || 'Неизвестное оборудование',
              lineNumber: row['Номер линии'] || 'Неизвестный участок',
              cabinetName: row['Имя шкафа'] || 'Неизвестный шкаф',
              deviceDesignation: row['Обозначение устройства'] || 'Неизвестное устройство',
              deviceType: row['Тип устройства'] || 'Неизвестный тип',
              description: row['Описание'] || 'Описание отсутствует',
              parentId: row['ID родителя'] || null
            };

            // Проверка существования устройства
            const existingDevice = await Device.findOne({
              where: {
                systemCode: deviceData.systemCode,
                equipmentCode: deviceData.equipmentCode,
                deviceDesignation: deviceData.deviceDesignation || ''
              }
            });

            if (existingDevice) {
              // Обновляем существующее устройство
              await existingDevice.update(deviceData);
              successCount.updated++;
            } else {
              // Создаем новое устройство
              await Device.create(deviceData);
              successCount.created++;
            }
          } catch (error) {
            console.error('Ошибка при обработке строки CSV:', error);
            errors.push(`Ошибка в строке: ${JSON.stringify(row)}: ${error.message}`);
          }
        }

        // Удаление временного файла
        fs.unlinkSync(filePath);

        // Возвращаем результат
        res.status(200).json({
          message: 'Импорт успешно завершен',
          created: successCount.created,
          updated: successCount.updated,
          errors: errors.length > 0 ? errors : undefined
        });
      });
  } catch (error) {
    console.error('Ошибка при импорте из CSV:', error);
    res.status(500).json({ message: 'Ошибка сервера при импорте из CSV' });
  }
};

// Импорт из файла @zra.csv
const importFromZraCsv = async (filePath: string, res: Response): Promise<void> => {
  const results: any[] = [];
  const errors: string[] = [];
  const successCount = { created: 0, updated: 0 };

  console.log('Начало импорта из @zra.csv:', filePath);

  try {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        console.log(`Прочитано строк из @zra.csv: ${results.length}`);
        
        // Проверка структуры файла
        if (results.length === 0) {
          res.status(400).json({ message: 'Файл не содержит данных' });
          return;
        }

        for (const row of results) {
          try {
            // Маппинг полей из @zra.csv в модель Device
            const deviceData = {
              systemCode: 'ZRA', // Стандартный код системы для ZRA
              equipmentCode: row['Позиция запорной арматуры'] || 'ZRA_' + Math.random().toString(36).substring(7), // Используем позицию как код оборудования
              deviceType: 'Запорно-регулирующая арматура', // Тип устройства для ZRA
              lineNumber: row['Участок'] || 'Неизвестный участок',
              cabinetName: 'Запорная арматура',
              deviceDesignation: row['Позиция запорной арматуры'] || 'ЗРА',
              description: `Участок: ${row['Участок'] || 'Н/Д'}, Тип: ${row['Тип арматуры'] || 'Н/Д'}, DN: ${row['DN'] || 'Н/Д'}, PN: ${row['PN'] || 'Н/Д'}`
            };

            // Проверка существования устройства
            const existingDevice = await Device.findOne({
              where: {
                equipmentCode: deviceData.equipmentCode
              }
            });

            if (existingDevice) {
              // Обновляем существующее устройство
              await existingDevice.update(deviceData);
              successCount.updated++;
            } else {
              // Создаем новое устройство
              await Device.create(deviceData);
              successCount.created++;
            }
          } catch (error) {
            console.error('Ошибка при обработке строки @zra.csv:', error);
            errors.push(`Ошибка в строке: ${JSON.stringify(row)}: ${error.message}`);
          }
        }

        // Удаление временного файла
        fs.unlinkSync(filePath);

        // Возвращаем результат
        res.status(200).json({
          message: 'Импорт успешно завершен',
          created: successCount.created,
          updated: successCount.updated,
          errors: errors.length > 0 ? errors : undefined
        });
      });
  } catch (error) {
    console.error('Ошибка при импорте из @zra.csv:', error);
    res.status(500).json({ message: 'Ошибка сервера при импорте из @zra.csv' });
  }
};

// Функция для сохранения устройств в базу данных
const saveDevicesToDatabase = async (devices: any[]): Promise<{ message: string; importedCount: number }> => {
  let importedCount = 0;
  
  // Проходим по всем устройствам и сохраняем их
  for (const deviceData of devices) {
    try {
      // Проверяем, существует ли устройство с такими же кодами
      const existingDevice = await Device.findOne({
        where: {
          systemCode: deviceData.systemCode,
          equipmentCode: deviceData.equipmentCode,
          deviceDesignation: deviceData.deviceDesignation || ''
        }
      });
      
      if (existingDevice) {
        // Обновляем существующее устройство
        await existingDevice.update(deviceData);
      } else {
        // Создаем новое устройство
        await Device.create(deviceData);
        importedCount++;
      }
    } catch (error) {
      console.error('Ошибка при сохранении устройства:', error);
      // Продолжаем импорт остальных устройств
    }
  }
  
  return { message: 'Импорт успешно завершен', importedCount };
}; 