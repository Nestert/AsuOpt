import fs from 'fs';
import csvParser from 'csv-parser';
import { DeviceReference } from '../models/DeviceReference';
import { Kip } from '../models/Kip';
import { Zra } from '../models/Zra';
import { Signal } from '../models/Signal';
import { DeviceSignal } from '../models/DeviceSignal';
import { Device } from '../models/Device';

export class ImportService {
  /**
   * Анализ CSV файла (чтение заголовков и примеров данных)
   */
  static async analyzeCsvFile(filePath: string, separator: string = ','): Promise<{ headers: string[]; sampleData: any[]; totalRows: number }> {
    return new Promise((resolve, reject) => {
      const sampleData: any[] = [];
      let headers: string[] = [];
      let totalRows = 0;

      fs.createReadStream(filePath)
        .pipe(csvParser({ separator }))
        .on('headers', (headerList) => {
          headers = headerList;
        })
        .on('data', (data) => {
          totalRows++;
          if (sampleData.length < 3) {
            sampleData.push(data);
          }
        })
        .on('end', () => {
          resolve({ headers, sampleData, totalRows });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Импорт данных КИП из CSV файла
   * @param filePath Путь к CSV файлу
   */
  static async importKipFromCsv(
    filePath: string,
    projectId: number = 1,
    columnMap: Record<string, string> = {}
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

      // Функция очистки текстовых полей (убирает переносы строк, лишние пробелы)
      const cleanVal = (val: any): string => {
        if (!val) return '';
        return String(val).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      };

      // Счетчик импортированных записей
      let importedCount = 0;

      const getVal = (row: any, mapKey: string, fallbacks: string[]) => {
        if (columnMap[mapKey] && row[columnMap[mapKey]] !== undefined) {
          return row[columnMap[mapKey]];
        }
        for (const fallback of fallbacks) {
          if (row[fallback] !== undefined) return row[fallback];
        }
        return undefined;
      };

      // Обрабатываем данные и создаем записи
      for (const row of results) {
        try {
          // Извлекаем позиционное обозначение и тип устройства
          const posDesignation = getVal(row, 'posDesignation', ['Позиционное обозначение ОТХ', 'Позиционное обозначение ОАС\n (ТЕМП)']);
          const deviceType = getVal(row, 'deviceType', ['Тип прибора']);

          if (!posDesignation || !deviceType) {
            continue; // Пропускаем строки без ключевых данных
          }

          // Создаем или находим запись в справочнике устройств
          const [deviceRef, created] = await DeviceReference.findOrCreate({
            where: { posDesignation: cleanVal(posDesignation), projectId },
            defaults: {
              deviceType: cleanVal(deviceType),
              description: cleanVal(getVal(row, 'description', ['Описание'])),
              projectId
            }
          });

          if (!created && deviceRef.projectId !== projectId) {
            await deviceRef.update({ projectId });
          }

          // Проверяем, существует ли уже запись KIP для этого устройства
          const existingKip = await Kip.findOne({
            where: { deviceReferenceId: deviceRef.id }
          });

          if (existingKip) {
            console.log(`Пропуск: запись KIP уже существует для ${cleanVal(posDesignation)}`);
            continue; // Пропускаем - дубликат
          }

          // Создаем запись КИП, связанную с устройством
          await Kip.create({
            deviceReferenceId: deviceRef.id,
            unitArea: cleanVal(getVal(row, 'unitArea', ['Участок'])),
            section: cleanVal(getVal(row, 'section', ['Секция'])),
            manufacturer: cleanVal(getVal(row, 'manufacturer', ['Производитель'])),
            article: cleanVal(getVal(row, 'article', ['Артикул'])),
            measureUnit: cleanVal(getVal(row, 'measureUnit', ['Ед. измерения'])),
            scale: cleanVal(getVal(row, 'scale', ['Шкала'])),
            note: cleanVal(getVal(row, 'note', ['Примечание'])),
            docLink: cleanVal(getVal(row, 'docLink', ['Ссылка на документацию'])),
            responsibilityZone: cleanVal(getVal(row, 'responsibilityZone', ['Зона отв.'])),
            connectionScheme: cleanVal(getVal(row, 'connectionScheme', ['Схема подключения'])),
            power: cleanVal(getVal(row, 'power', ['Питание'])),
            plc: cleanVal(getVal(row, 'plc', ['PLC'])),
            exVersion: cleanVal(getVal(row, 'exVersion', ['Ex-исполнение'])),
            environmentCharacteristics: cleanVal(getVal(row, 'environmentCharacteristics', ['Характеристика среды, физическое состояние, температура, давление, расход, Dn, плотность, содержание агрессивных примесей регулирование и пр.)'])),
            signalPurpose: cleanVal(getVal(row, 'signalPurpose', ['Назначение сигнала: предупредительный, аварийный'])),
            controlPoints: parseInt(String(getVal(row, 'controlPoints', ['Количество точек контроля']) || '0').replace(/[\r\n\s]+/g, ''), 10),
            completeness: cleanVal(getVal(row, 'completeness', ['Комплектность'])),
            measuringLimits: cleanVal(getVal(row, 'measuringLimits', ['Пределы измерений и нормальное значение параметра'])),
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
    } catch (error: any) {
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
    projectId: number = 1,
    columnMap: Record<string, string> = {}
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

      // Функция очистки текстовых полей (убирает переносы строк, лишние пробелы)
      const cleanVal = (val: any): string => {
        if (!val) return '';
        return String(val).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      };

      // Счетчик импортированных записей
      let importedCount = 0;

      const getVal = (row: any, mapKey: string, fallbacks: string[]) => {
        if (columnMap[mapKey] && row[columnMap[mapKey]] !== undefined) {
          return row[columnMap[mapKey]];
        }
        for (const fallback of fallbacks) {
          if (row[fallback] !== undefined) return row[fallback];
        }
        return undefined;
      };

      // Обрабатываем данные и создаем записи
      for (const row of results) {
        try {
          // Извлекаем позиционное обозначение и тип устройства
          const posDesignation = getVal(row, 'posDesignation', ['Позиция запорной арматуры']);
          const valveType = getVal(row, 'valveType', ['Тип арматуры (запорная/ Регулирующая)']) || 'Неизвестный';

          if (!posDesignation) {
            continue; // Пропускаем строки без ключевых данных
          }

          // Создаем или находим запись в справочнике устройств
          const [deviceRef, created] = await DeviceReference.findOrCreate({
            where: { posDesignation: cleanVal(posDesignation), projectId },
            defaults: {
              deviceType: cleanVal(getVal(row, 'deviceType', ['Конструктивное исполнение'])) || 'Запорная арматура',
              description: cleanVal(getVal(row, 'description', ['Описание (ТЕМП)'])),
              projectId
            }
          });

          if (!created && deviceRef.projectId !== projectId) {
            await deviceRef.update({ projectId });
          }

          // Проверяем, существует ли уже запись ZRA для этого устройства
          const existingZra = await Zra.findOne({
            where: { deviceReferenceId: deviceRef.id }
          });

          if (existingZra) {
            console.log(`Пропуск: запись ZRA уже существует для ${cleanVal(posDesignation)}`);
            continue; // Пропускаем - дубликат
          }

          // Создаем запись ЗРА, связанную с устройством
          await Zra.create({
            deviceReferenceId: deviceRef.id,
            unitArea: cleanVal(getVal(row, 'unitArea', ['Участок'])),
            designType: cleanVal(getVal(row, 'designType', ['Конструктивное исполнение'])),
            valveType: cleanVal(valveType),
            actuatorType: cleanVal(getVal(row, 'actuatorType', ['Тип привода'])),
            pipePosition: cleanVal(getVal(row, 'pipePosition', ['Позиция трубы'])),
            nominalDiameter: cleanVal(getVal(row, 'nominalDiameter', ['Условный диаметр трубы DN'])),
            pressureRating: cleanVal(getVal(row, 'pressureRating', ['Условное давление рабочей среды PN, бар'])),
            pipeMaterial: cleanVal(getVal(row, 'pipeMaterial', ['Материал трубы'])),
            medium: cleanVal(getVal(row, 'medium', ['Среда'])),
            positionSensor: cleanVal(getVal(row, 'positionSensor', ['Датчик положения'])),
            solenoidType: cleanVal(getVal(row, 'solenoidType', ['Тип пневмораспределителя'])),
            emergencyPosition: cleanVal(getVal(row, 'emergencyPosition', ['Положение при аварийном отключении (НЗ/НО/БИ)'])),
            controlPanel: getVal(row, 'controlPanel', ['ШПУ']) || '',
            airConsumption: getVal(row, 'airConsumption', ['Расход воздуха на 1 операцию, л.']) || '',
            connectionSize: getVal(row, 'connectionSize', ['Ø и резьба пневмоприсоединения']) || '',
            fittingsCount: parseInt(getVal(row, 'fittingsCount', ['Кол-во ответных фитингов']) || '0', 10),
            tubeDiameter: getVal(row, 'tubeDiameter', ['Ø пневмотрубки, мм']) || '',
            limitSwitchType: getVal(row, 'limitSwitchType', ['Тип концевого выключателя']) || '',
            positionerType: getVal(row, 'positionerType', ['Тип позиционера']) || '',
            deviceDescription: getVal(row, 'deviceDescription', ['Описание устройства']) || '',
            category: getVal(row, 'category', ['Категория']) || '',
            plc: getVal(row, 'plc', ['PLC']) || '',
            exVersion: getVal(row, 'exVersion', ['Ex-исполнение']) || '',
            operation: getVal(row, 'operation', ['Операция']) || '',
            note: getVal(row, 'note', ['Примечание']) || '',
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
    } catch (error: any) {
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
  static async importSignalCategoriesFromCsv(filePath: string, columnMap: Record<string, string> = {}): Promise<{ success: boolean; message: string; count?: number }> {
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

      const getVal = (row: any, mapKey: string, fallbacks: string[]) => {
        if (columnMap[mapKey] && row[columnMap[mapKey]] !== undefined) {
          return row[columnMap[mapKey]];
        }
        for (const fallback of fallbacks) {
          if (row[fallback] !== undefined) return row[fallback];
        }
        return undefined;
      };

      // Обрабатываем данные и создаем записи сигналов
      for (const row of results) {
        try {
          const category = getVal(row, 'category', ['Категория']);
          const signalTypeRaw = getVal(row, 'signalType', ['Вид сигнала']);
          const description = getVal(row, 'description', ['Описание сигнала']);

          if (!category || !signalTypeRaw || !description) {
            console.log('Пропущена строка с неполными данными:', row);
            continue; // Пропускаем строки без обязательных полей
          }

          // Формируем имя сигнала: Категория + Описание сигнала
          const name = `${category} - ${description}`;

          // Преобразуем тип сигнала к допустимому формату (AI, AO, DI, DO)
          let signalType = signalTypeRaw.trim().toUpperCase();

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
              category: category
            }
          });

          if (!signal) {
            // Создаем новый сигнал
            signal = await Signal.create({
              name,
              type: signalType,
              description: description,
              totalCount: 0,
              category: category,
              connectionType: getVal(row, 'connectionType', ['Тип подключения']),
              voltage: getVal(row, 'voltage', ['Напряжение'])
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
    } catch (error: any) {
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

      // Получаем все устройства (фильтруем по проекту, если указан)
      const { DeviceReference } = require('../models/DeviceReference');
      const whereClause: any = {};

      if (projectId) {
        whereClause.projectId = projectId;
      }

      const allDevices = await DeviceReference.findAll({
        where: whereClause
      });

      // Фильтруем устройства в JS для регистронезависимого сопоставления (SQLite не поддерживает кириллицу в LIKE/LOWER)
      const targetTypeClean = deviceType.trim().toLowerCase();
      console.log(`[DEBUG assign] category: "${deviceType}" -> clean: "${targetTypeClean}"`);

      // Ищем совпадения в таблице ZRA по полю "Категория"
      const { Zra } = require('../models/Zra');
      let zraDeviceIds: number[] = [];
      try {
        const zras = await Zra.findAll({
          attributes: ['deviceReferenceId', 'category']
        });
        zraDeviceIds = zras
          .filter((z: any) => z.category && z.category.trim().toLowerCase() === targetTypeClean)
          .map((z: any) => z.deviceReferenceId);
      } catch (err) {
        console.error('Ошибка при поиске категорий ZRA:', err);
      }

      // Ищем совпадения в таблице KIP по полю "Схема подключения" (connectionScheme)
      const { Kip } = require('../models/Kip');
      let kipDeviceIds: number[] = [];
      try {
        const kips = await Kip.findAll({
          attributes: ['deviceReferenceId', 'connectionScheme']
        });
        kipDeviceIds = kips
          .filter((k: any) => k.connectionScheme && k.connectionScheme.trim().toLowerCase() === targetTypeClean)
          .map((k: any) => k.deviceReferenceId);
      } catch (err) {
        console.error('Ошибка при поиске схем подключения KIP:', err);
      }

      // Предзаданные маппинги для известных несовпадений
      const predefinedMappings: Record<string, string[]> = {
        'уровнемер': ['сигнализатор уровня', 'уровнемер'],
        'датчик давления': ['датчик давления', 'датчик давления '],
      };

      const mappedTypes = predefinedMappings[targetTypeClean] || [targetTypeClean];

      const devices = allDevices.filter((d: any) => {
        // Проверяем принадлежность к ZRA категории (поле "Категория")
        if (zraDeviceIds.includes(d.id)) {
          console.log(`[DEBUG assign]   MATCHED via ZRA category: "${d.deviceType}" for ZRA device ID ${d.id}`);
          return true;
        }

        // Проверяем принадлежность к KIP по схеме подключения (поле "Схема подключения")
        if (kipDeviceIds.includes(d.id)) {
          console.log(`[DEBUG assign]   MATCHED via KIP connectionScheme: "${d.deviceType}" for KIP device ID ${d.id}`);
          return true;
        }

        if (!d.deviceType) return false;
        const dClean = d.deviceType.trim().toLowerCase();

        // 1. Точное совпадение с очисткой
        // 2. Частичное совпадение (fuzzy)
        // 3. Совпадение по предзаданному словарю
        const isMatch = mappedTypes.includes(dClean) ||
          dClean.includes(targetTypeClean) ||
          targetTypeClean.includes(dClean);

        if (isMatch) {
          console.log(`[DEBUG assign]   MATCHED deviceType: "${d.deviceType}" -> clean: "${dClean}"`);
        }
        return isMatch;
      });

      if (devices.length === 0) {
        console.log(`[DEBUG assign]   NO MATCHES FOUND for "${targetTypeClean}" in ${allDevices.length} devices.`);
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
    } catch (error: any) {
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

      // Получаем все сигналы
      const allSignals = await Signal.findAll();

      // Для КИП используем category (полную строку!), для ЗРА используем category
      // Собираем уникальные пары (keyType, keyValue) для назначения
      const assignmentMap = new Map<string, { type: 'category' | 'connectionType', value: string }>();

      for (const signal of allSignals) {
        // Определяем тип устройства на основе category сигнала
        const category = signal.category || '';
        
        // ЗРА: ищем по category (например "Пневмо ЗРА-CV")
        // КИП: тоже ищем по category (например "КИП AI 2-провод") - это полное совпадение с KIP.connectionScheme
        if (category) {
          assignmentMap.set(`cat_${category}`, { type: 'category', value: category });
        }
      }

      if (assignmentMap.size === 0) {
        return {
          success: false,
          message: 'Не найдены категории или типы подключения сигналов для назначения'
        };
      }

      console.log(`Найдено ${assignmentMap.size} уникальных ключей для назначения`);

      let totalAssignedCount = 0;
      let successfulTypes = 0;
      let failedTypes = 0;

      // Назначаем сигналы для каждого ключа
      const assignmentEntries = Array.from(assignmentMap.entries());
      for (let i = 0; i < assignmentEntries.length; i++) {
        const config = assignmentEntries[i][1];
        try {
          console.log(`Назначение сигналов для ${config.type}: ${config.value}`);
          
          // Вызываем функцию с дополнительным параметром
          const result = await ImportService.assignSignalsByKey(config.value, config.type, projectId);

          if (result.success) {
            totalAssignedCount += result.count || 0;
            successfulTypes++;
          } else {
            console.log(`Не удалось назначить сигналы для ${config.type}="${config.value}": ${result.message}`);
            failedTypes++;
          }
        } catch (error) {
          console.error(`Ошибка при назначении сигналов для ${config.type}="${config.value}":`, error);
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
    } catch (error: any) {
      console.error('Ошибка при назначении сигналов всем типам устройств:', error);
      return {
        success: false,
        message: `Ошибка при назначении сигналов: ${error.message}`
      };
    }
  }

  /**
   * Привязка сигналов к устройствам по ключу (category или connectionType)
   * @param keyValue Значение ключа (категория или тип подключения)
   * @param keyType Тип ключа ('category' или 'connectionType')
   */
  static async assignSignalsByKey(keyValue: string, keyType: 'category' | 'connectionType', projectId?: number): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const keyClean = keyValue.trim().toLowerCase();
      console.log(`[assignSignalsByKey] ${keyType}: "${keyValue}" -> clean: "${keyClean}"`);

      // Получаем сигналы для данного ключа
      const whereClause = keyType === 'category' 
        ? { category: keyValue }
        : { connectionType: keyValue };
      
      const signals = await Signal.findAll({ where: whereClause as any });

      if (signals.length === 0) {
        return {
          success: false,
          message: `Сигналы для "${keyType}"="${keyValue}" не найдены`
        };
      }

      // Получаем все устройства (фильтруем по проекту, если указан)
      const { DeviceReference } = require('../models/DeviceReference');
      const deviceWhereClause: any = {};
      if (projectId) {
        deviceWhereClause.projectId = projectId;
      }

      const allDevices = await DeviceReference.findAll({
        where: deviceWhereClause
      });

      // Ищем устройства по соответствующему полю
      let matchedDeviceIds: number[] = [];

      // Для всех категорий ищем и в ZRA (по category) и в KIP (по connectionScheme)
      // Это работает для обеих типов: ЗРА (category) и КИП (connectionScheme = category)
      
      // Ищем в ZRA по полю category
      const { Zra } = require('../models/Zra');
      try {
        const zras = await Zra.findAll({
          attributes: ['deviceReferenceId', 'category']
        });
        const zraMatches = zras
          .filter((z: any) => {
            if (!z.category) return false;
            const zCatClean = z.category.trim().toLowerCase().replace(/\s+/g, ' ');
            return zCatClean.includes(keyClean) || keyClean.includes(zCatClean);
          })
          .map((z: any) => z.deviceReferenceId);
        matchedDeviceIds = [...matchedDeviceIds, ...zraMatches];
        console.log(`[assignSignalsByKey] ZRA: found ${zraMatches.length} devices for category "${keyClean}"`);
      } catch (err) {
        console.error('Ошибка при поиске категорий ZRA:', err);
      }

      // Ищем в KIP по полю connectionScheme
      const { Kip } = require('../models/Kip');
      try {
        const kips = await Kip.findAll({
          attributes: ['deviceReferenceId', 'connectionScheme']
        });
        const kipMatches = kips
          .filter((k: any) => {
            if (!k.connectionScheme) return false;
            const kSchemeClean = k.connectionScheme.trim().toLowerCase().replace(/\n/g, ' ').replace(/\s+/g, ' ');
            return kSchemeClean.includes(keyClean) || keyClean.includes(kSchemeClean);
          })
          .map((k: any) => k.deviceReferenceId);
        matchedDeviceIds = [...matchedDeviceIds, ...kipMatches];
        console.log(`[assignSignalsByKey] KIP: found ${kipMatches.length} devices for connectionScheme "${keyClean}"`);
      } catch (err) {
        console.error('Ошибка при поиске схем подключения KIP:', err);
      }

      console.log(`[assignSignalsByKey] Found ${matchedDeviceIds.length} devices total for "${keyClean}"`);

      const devices = allDevices.filter((d: any) => matchedDeviceIds.includes(d.id));

      if (devices.length === 0) {
        return {
          success: false,
          message: `Устройства с ${keyType}="${keyValue}" не найдены`
        };
      }

      let assignedCount = 0;

      // Предварительно проверяем существование устройств в таблице Device
      // и создаем их если нужно
      const validDevices = [];
      for (const deviceRef of devices) {
        let device = await Device.findByPk(deviceRef.id);

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
            continue;
          }
        }

        if (device) {
          validDevices.push(device);
        }
      }

      if (validDevices.length === 0) {
        return {
          success: false,
          message: `Не удалось найти или создать устройства с ${keyType}="${keyValue}" в основной таблице`
        };
      }

      // Для каждого валидного устройства назначаем все сигналы
      for (const device of validDevices) {
        for (const signal of signals) {
          try {
            const existingAssignment = await DeviceSignal.findOne({
              where: {
                deviceId: device.id,
                signalId: signal.id
              }
            });

            if (!existingAssignment) {
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

              await DeviceSignal.create({
                deviceId: device.id,
                signalId: signal.id,
                count: 1
              });

              assignedCount++;
            }
          } catch (error) {
            console.error(`Ошибка при назначении сигнала ${signal.id} устройству ${device.id}:`, error);
          }
        }
      }

      return {
        success: true,
        message: `Успешно назначено ${assignedCount} сигналов для ${keyType}="${keyValue}"`,
        count: assignedCount
      };
    } catch (error: any) {
      console.error(`Ошибка при assignSignalsByKey:`, error);
      return {
        success: false,
        message: `Ошибка: ${error.message}`
      };
    }
  }
}