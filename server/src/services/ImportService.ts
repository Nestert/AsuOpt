import fs from 'fs';
import csvParser from 'csv-parser';
import { DeviceReference } from '../models/DeviceReference';
import { Kip } from '../models/Kip';
import { Zra } from '../models/Zra';

export class ImportService {
  /**
   * Импорт данных КИП из CSV файла
   * @param filePath Путь к CSV файлу
   */
  static async importKipFromCsv(filePath: string): Promise<{ success: boolean; message: string; count?: number }> {
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
            where: { posDesignation },
            defaults: {
              deviceType,
              description: row['Описание'] || '',
            }
          });
          
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
  static async importZraFromCsv(filePath: string): Promise<{ success: boolean; message: string; count?: number }> {
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
            where: { posDesignation },
            defaults: {
              deviceType: row['Конструктивное исполнение'] || 'Запорная арматура',
              description: row['Описание (ТЕМП)'] || '',
            }
          });
          
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
} 