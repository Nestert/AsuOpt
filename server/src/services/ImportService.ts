import fs from 'fs';
import csvParser from 'csv-parser';
import { DeviceReference } from '../models/DeviceReference';
import { Kip } from '../models/Kip';
import { Zra } from '../models/Zra';
import { Signal } from '../models/Signal';
import { DeviceSignal } from '../models/DeviceSignal';
import { Device } from '../models/Device';
import { Op } from 'sequelize';

export class ImportService {
  /**
   * Импорт данных КИП из CSV файла
   * @param filePath Путь к CSV файлу
   */
  static async importKipFromCsv(
    filePath: string,
    projectId: number = 1
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const results: any[] = [];
      
      // Читаем CSV файл
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve())
          .on('error', (error) => reject(error));
      });
      
      // Счетчик импортированных записей
      let importedCount = 0;
      
      // Обрабатываем данные и создаем записи
      for (const row of results) {
        try {
          // Извлекаем позиционное обозначение и тип устройства
          const posDesignation = row['Позиционное обозначение ОТХ'] || row['Позиционное обозначение ОАС\n (ТЕМП)'];
          const deviceType = row['Тип прибора'];
          
          if (!posDesignation || !deviceType) {
            continue; // Пропускаем строки без ключевых данных
          }
          
          // Создаем или находим запись в справочнике устройств
          const [deviceRef, created] = await DeviceReference.findOrCreate({
            where: { posDesignation, projectId },
            defaults: {
              deviceType,
              description: row['Описание'] || '',
              projectId
            }
          });

          if (!created && deviceRef.projectId !== projectId) {
            await deviceRef.update({ projectId });
          }
          
          // Создаем запись КИП, связанную с устройством
          await Kip.create({
            deviceReferenceId: deviceRef.id,
            unitArea: row['Участок'] || '',
            section: row['Секция'] || '',
            manufacturer: row['Производитель'] || '',
            article: row['Артикул'] || '',
            measureUnit: row['Ед. измерения'] || '',
            scale: row['Шкала'] || '',
            note: row['Примечание'] || '',
            docLink: row['Ссылка на документацию'] || '',
            responsibilityZone: row['Зона отв.'] || '',
            connectionScheme: row['Схема подключения'] || '',
            power: row['Питание'] || '',
            plc: row['PLC'] || '',
            exVersion: row['Ex-исполнение'] || '',
            environmentCharacteristics: row['Характеристика среды, физическое состояние, температура, давление, расход, Dn, плотность, содержание агрессивных примесей регулирование и пр.)'] || '',
            signalPurpose: row['Назначение сигнала: предупредительный, аварийный'] || '',
            controlPoints: parseInt(row['Количество точек контроля'] || '0'),
            completeness: row['Комплектность'] || '',
            measuringLimits: row['Пределы измерений и нормальное значение параметра'] || '',
          });
          
          importedCount++;
        } catch (err) {
          console.error('Ошибка при импорте строки КИП:', err);
          // Продолжаем с следующей строкой
        }
      }
      
      return {
        success: true,
        message: `Успешно импортировано ${importedCount} записей КИП`,
        count: importedCount
      };
    } catch (error) {
      console.error('Ошибка при импорте файла КИП:', error);
      return {
        success: false,
        message: `Ошибка при импорте КИП: ${error.message}`
      };
    }
  }
  
  /**
   * Импорт данных ЗРА из CSV файла
   * @param filePath Путь к CSV файлу
   */
  static async importZraFromCsv(
    filePath: string,
    projectId: number = 1
  ): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const results: any[] = [];
      
      // Читаем CSV файл
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve())
          .on('error', (error) => reject(error));
      });
      
      // Счетчик импортированных записей
      let importedCount = 0;
      
      // Обрабатываем данные и создаем записи
      for (const row of results) {
        try {
          // Извлекаем позиционное обозначение и тип устройства
          const posDesignation = row['Позиция запорной арматуры'];
          const valveType = row['Тип арматуры (запорная/ Регулирующая)'] || 'Неизвестный';
          
          if (!posDesignation) {
            continue; // Пропускаем строки без ключевых данных
          }
          
          // Создаем или находим запись в справочнике устройств
          const [deviceRef, created] = await DeviceReference.findOrCreate({
            where: { posDesignation, projectId },
            defaults: {
              deviceType: row['Конструктивное исполнение'] || 'Запорная арматура',
              description: row['Описание (ТЕМП)'] || '',
              projectId
            }
          });

          if (!created && deviceRef.projectId !== projectId) {
            await deviceRef.update({ projectId });
          }
          
          // Создаем запись ЗРА, связанную с устройством
          await Zra.create({
            deviceReferenceId: deviceRef.id,
            unitArea: row['Участок'] || '',
            designType: row['Конструктивное исполнение'] || '',
            valveType: valveType,
            actuatorType: row['Тип привода'] || '',
            pipePosition: row['Позиция трубы'] || '',
            nominalDiameter: row['Условный диаметр трубы DN'] || '',
            pressureRating: row['Условное давление рабочей среды PN, бар'] || '',
            pipeMaterial: row['Материал трубы'] || '',
            medium: row['Среда'] || '',
            positionSensor: row['Датчик положения'] || '',
            solenoidType: row['Тип пневмораспределителя'] || '',
            emergencyPosition: row['Положение при аварийном отключении (НЗ/НО/БИ)'] || '',
            controlPanel: row['ШПУ'] || '',
            airConsumption: row['Расход воздуха на 1 операцию, л.'] || '',
            connectionSize: row['Ø и резьба пневмоприсоединения'] || '',
            fittingsCount: parseInt(row['Кол-во ответных фитингов'] || '0'),
            tubeDiameter: row['Ø пневмотрубки, мм'] || '',
            limitSwitchType: row['Тип концевого выключателя'] || '',
            positionerType: row['Тип позиционера'] || '',
            deviceDescription: row['Описание устройства'] || '',
            category: row['Категория'] || '',
            plc: row['PLC'] || '',
            exVersion: row['Ex-исполнение'] || '',
            operation: row['Операция'] || '',
            note: row['Примечание'] || '',
          });
          
          importedCount++;
        } catch (err) {
          console.error('Ошибка при импорте строки ЗРА:', err);
          // Продолжаем с следующей строкой
        }
      }
      
      return {
        success: true,
        message: `Успешно импортировано ${importedCount} записей ЗРА`,
        count: importedCount
      };
    } catch (error) {
      console.error('Ошибка при импорте файла ЗРА:', error);
      return {
        success: false,
        message: `Ошибка при импорте ЗРА: ${error.message}`
      };
    }
  }
  
  /**
   * Получение статистики по импорту
   */
  static async getImportStats(): Promise<{ deviceReferences: number; kips: number; zras: number }> {
    const deviceReferences = await DeviceReference.count();
    const kips = await Kip.count();
    const zras = await Zra.count();
    
    return {
      deviceReferences,
      kips,
      zras
    };
  }

  /**
   * Импорт категорий сигналов из CSV файла
   * @param filePath Путь к CSV файлу
   */
  static async importSignalCategoriesFromCsv(filePath: string): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const results: any[] = [];
      
      // Читаем CSV файл
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser({ separator: ';' })) // Используем разделитель ";" для CSV
          .on('data', (data) => results.push(data))
          .on('end', () => resolve())
          .on('error', (error) => reject(error));
      });
      
      // Счетчик импортированных записей
      let importedCount = 0;
      
      // Обрабатываем данные и создаем записи сигналов
      for (const row of results) {
        try {
          if (!row['Категория'] || !row['Вид сигнала'] || !row['Описание сигнала']) {
            console.log('Пропущена строка с неполными данными:', row);
            continue; // Пропускаем строки без обязательных полей
          }

          // Формируем имя сигнала: Категория + Описание сигнала
          const name = `${row['Категория']} - ${row['Описание сигнала']}`;
          
          // Преобразуем тип сигнала к допустимому формату (AI, AO, DI, DO)
          let signalType = row['Вид сигнала'].trim().toUpperCase();
          
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
          
          console.log(`Импорт сигнала: ${name}, тип ${signalType}`);
          
          // Проверяем, существует ли уже такой сигнал
          let signal = await Signal.findOne({
            where: {
              name,
              type: signalType,
              category: row['Категория']
            }
          });
          
          if (!signal) {
            // Создаем новый сигнал
            signal = await Signal.create({
              name,
              type: signalType,
              description: row['Описание сигнала'],
              totalCount: 0,
              category: row['Категория'],
              connectionType: row['Тип подключения'],
              voltage: row['Напряжение']
            });
            
            importedCount++;
          }
        } catch (err) {
          console.error('Ошибка при импорте строки сигнала:', err);
          // Продолжаем с следующей строкой
        }
      }
      
      return {
        success: true,
        message: `Успешно импортировано ${importedCount} категорий сигналов`,
        count: importedCount
      };
    } catch (error) {
      console.error('Ошибка при импорте файла категорий сигналов:', error);
      return {
        success: false,
        message: `Ошибка при импорте: ${error.message}`
      };
    }
  }
  
  /**
   * Привязка сигналов к устройствам на основе их типа
   * @param deviceType Тип устройства
   */
  static async assignSignalsToDevicesByType(deviceType: string, projectId?: number): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      // Получаем все сигналы для данной категории (типа устройства)
      const signals = await Signal.findAll({
        where: { category: deviceType }
      });
      
      if (signals.length === 0) {
        return {
          success: false,
          message: `Сигналы для типа устройства "${deviceType}" не найдены`
        };
      }
      
      // Получаем все устройства данного типа
      const { DeviceReference } = require('../models/DeviceReference');
      const whereClause: any = { deviceType };

      if (projectId) {
        whereClause.projectId = projectId;
      }

      const devices = await DeviceReference.findAll({
        where: whereClause
      });
      
      if (devices.length === 0) {
        return {
          success: false,
          message: `Устройства типа "${deviceType}" не найдены`
        };
      }
      
      let assignedCount = 0;
      
      // Предварительно проверяем существование устройств в таблице Device
      // и создаем их если нужно
      const validDevices = [];
      for (const deviceRef of devices) {
        // Проверяем существование устройства в таблице Device
        let device = await Device.findByPk(deviceRef.id);
        
        // Если устройства нет в таблице Device, создаем его
        if (!device) {
          try {
            console.log(`Создаем устройство ${deviceRef.id} в таблице Device`);
            device = await Device.create({
              id: deviceRef.id,
              systemCode: deviceRef.deviceType || 'Unknown',
              equipmentCode: 'Auto',
              lineNumber: 'Auto',
              cabinetName: 'Auto',
              deviceDesignation: deviceRef.posDesignation,
              deviceType: deviceRef.deviceType,
              description: deviceRef.description || '',
              parentId: null
            });
            console.log(`Устройство ${device.id} создано успешно`);
          } catch (err) {
            console.error(`Ошибка при создании устройства ${deviceRef.id}:`, err);
            continue; // Пропускаем это устройство
          }
        }
        
        // Если устройство существует, добавляем его в список для обработки
        if (device) {
          validDevices.push(device);
        }
      }
      
      if (validDevices.length === 0) {
        return {
          success: false,
          message: `Не удалось найти или создать устройства типа "${deviceType}" в основной таблице`
        };
      }
      
      // Для каждого валидного устройства назначаем все сигналы соответствующей категории
      for (const device of validDevices) {
        for (const signal of signals) {
          try {
            // Проверяем, существует ли уже такое назначение
            const existingAssignment = await DeviceSignal.findOne({
              where: {
                deviceId: device.id,
                signalId: signal.id
              }
            });
            
            if (!existingAssignment) {
              // Дополнительная проверка существования сигнала и устройства
              const signalExists = await Signal.findByPk(signal.id);
              const deviceExists = await Device.findByPk(device.id);
              
              if (!signalExists) {
                console.error(`Сигнал с ID ${signal.id} не существует`);
                continue;
              }
              
              if (!deviceExists) {
                console.error(`Устройство с ID ${device.id} не существует`);
                continue;
              }
              
              // Создаем новое назначение сигнала устройству
              await DeviceSignal.create({
                deviceId: device.id,
                signalId: signal.id,
                count: 1 // По умолчанию количество 1
              });
              
              assignedCount++;
            }
          } catch (error) {
            console.error(`Ошибка при назначении сигнала ${signal.id} устройству ${device.id}:`, error);
            // Продолжаем с другими сигналами/устройствами
          }
        }
      }
      
      // Обновляем счетчики в таблице сигналов
      await ImportService.updateSignalCounts();
      
      return {
        success: true,
        message: `Успешно назначено ${assignedCount} сигналов устройствам типа "${deviceType}"`,
        count: assignedCount
      };
    } catch (error) {
      console.error('Ошибка при назначении сигналов устройствам:', error);
      return {
        success: false,
        message: `Ошибка при назначении сигналов: ${error.message}`
      };
    }
  }
  
  /**
   * Обновление счетчиков сигналов
   */
  static async updateSignalCounts(): Promise<void> {
    try {
      // Получаем все сигналы
      const signals = await Signal.findAll();
      
      for (const signal of signals) {
        // Считаем количество использований сигнала
        const count = await DeviceSignal.count({
          where: { signalId: signal.id }
        });
        
        // Обновляем счетчик
        await signal.update({ totalCount: count });
      }
    } catch (error) {
      console.error('Ошибка при обновлении счетчиков сигналов:', error);
    }
  }
  
  /**
   * Назначение сигналов всем типам устройств
   */
  static async assignSignalsToAllDeviceTypes(projectId?: number): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      console.log('Начато назначение сигналов всем типам устройств');
      
      // Получаем все уникальные категории сигналов (они же типы устройств)
      const signalCategories = await Signal.findAll({
        attributes: ['category'],
        where: {
          category: {
            [Op.not]: null,
            [Op.ne]: ''
          }
        },
        group: ['category']
      });
      
      // Извлекаем только значения категорий
      const categories = signalCategories
        .map(signal => signal.category)
        .filter(category => !!category); // Убираем пустые значения
      
      if (categories.length === 0) {
        return {
          success: false,
          message: 'Не найдены категории сигналов для назначения'
        };
      }
      
      console.log(`Найдено ${categories.length} категорий сигналов: ${categories.join(', ')}`);
      
      let totalAssignedCount = 0;
      let successfulTypes = 0;
      let failedTypes = 0;
      
      // Назначаем сигналы для каждого типа устройства
      for (const category of categories) {
        try {
          console.log(`Назначение сигналов для типа устройств: ${category}`);
          const result = await ImportService.assignSignalsToDevicesByType(category, projectId);
          
          if (result.success) {
            totalAssignedCount += result.count || 0;
            successfulTypes++;
          } else {
            console.log(`Не удалось назначить сигналы для типа ${category}: ${result.message}`);
            failedTypes++;
          }
        } catch (error) {
          console.error(`Ошибка при назначении сигналов для типа ${category}:`, error);
          failedTypes++;
        }
      }
      
      // Обновляем счетчики сигналов
      await ImportService.updateSignalCounts();
      
      return {
        success: true,
        message: `Назначение сигналов завершено. Успешно: ${successfulTypes} типов, неудачно: ${failedTypes} типов. Всего назначено ${totalAssignedCount} сигналов.`,
        count: totalAssignedCount
      };
    } catch (error) {
      console.error('Ошибка при назначении сигналов всем типам устройств:', error);
      return {
        success: false,
        message: `Ошибка при назначении сигналов: ${error.message}`
      };
    }
  }
} 