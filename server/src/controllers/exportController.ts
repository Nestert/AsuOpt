import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { Device } from '../models/Device';
import { DeviceSignal } from '../models/DeviceSignal';
import { Signal } from '../models/Signal';
import { DeviceReference } from '../models/DeviceReference';
import { Kip } from '../models/Kip';
import { Zra } from '../models/Zra';
import { Sequelize } from 'sequelize';

// Интерфейсы для правильной типизации
interface DeviceSignalWithRelations extends DeviceSignal {
  signal?: Signal;
  device?: Device;
}

interface DeviceReferenceWithRelations extends DeviceReference {
  kip?: Kip;
  zra?: Zra;
}

// Экспорт списка устройств в Excel
export const exportToExcel = async (req: Request, res: Response) => {
  try {
    // Получаем все устройства
    const devices = await Device.findAll();

    // Создаем новую книгу Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Список устройств');

    // Определяем заголовки столбцов
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Код системы', key: 'systemCode', width: 15 },
      { header: 'Код оборудования', key: 'equipmentCode', width: 20 },
      { header: 'Номер линии', key: 'lineNumber', width: 15 },
      { header: 'Имя шкафа', key: 'cabinetName', width: 20 },
      { header: 'Обозначение устройства', key: 'deviceDesignation', width: 25 },
      { header: 'Тип устройства', key: 'deviceType', width: 20 },
      { header: 'Описание', key: 'description', width: 30 },
      { header: 'ID родителя', key: 'parentId', width: 15 }
    ];

    // Применяем стиль к заголовкам
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Добавляем данные
    devices.forEach(device => {
      worksheet.addRow({
        id: device.id,
        systemCode: device.systemCode,
        equipmentCode: device.equipmentCode,
        lineNumber: device.lineNumber,
        cabinetName: device.cabinetName,
        deviceDesignation: device.deviceDesignation,
        deviceType: device.deviceType,
        description: device.description,
        parentId: device.parentId
      });
    });

    // Устанавливаем заголовки для ответа
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=devices.xlsx');

    // Отправляем файл клиенту
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Ошибка при экспорте в Excel:', error);
    res.status(500).json({ message: 'Ошибка сервера при экспорте в Excel' });
  }
};

// Экспорт сигналов устройств в Excel
export const exportSignalsToExcel = async (req: Request, res: Response) => {
  try {
    const { columns = [], include_plc = false } = req.body;
    
    // Получаем все сигналы устройств с включением связанных моделей
    const deviceSignals = await DeviceSignal.findAll({
      include: [
        {
          model: Signal,
          as: 'signal',
          attributes: ['id', 'name', 'type', 'description', 'category', 'connectionType', 'voltage']
        },
        {
          model: Device,
          as: 'device',
          attributes: ['id', 'deviceDesignation', 'deviceType', 'systemCode', 'equipmentCode']
        }
      ]
    });
    
    // Если нужно включить информацию о ПЛК, получаем ее дополнительно
    let devicePlcMap = new Map();
    if (include_plc) {
      // Получаем все устройства с их ссылками на справочник и информацией о ПЛК
      const deviceReferences = await DeviceReference.findAll({
        attributes: ['id', 'plcType'],
        include: [
          {
            model: Kip,
            as: 'kip',
            attributes: ['id', 'plc'],
            required: false
          },
          {
            model: Zra,
            as: 'zra',
            attributes: ['id', 'plc'],
            required: false
          }
        ]
      });

      // Создаем карту, связывающую ID устройства с информацией о его ПЛК
      for (const reference of deviceReferences) {
        let plcInfo = reference.plcType || '';
        
        // Доступ к связанным моделям через get-методы, что типобезопасно
        const kipData = reference.get('kip') as Kip | null;
        const zraData = reference.get('zra') as Zra | null;
        
        // Дополняем информацией из Kip или Zra если есть
        if (kipData && kipData.plc) {
          plcInfo = kipData.plc;
        } else if (zraData && zraData.plc) {
          plcInfo = zraData.plc;
        }
        
        devicePlcMap.set(reference.id, plcInfo);
      }
    }
    
    // Создаем новую книгу Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Сигналы устройств');
    
    // Определяем заголовки столбцов
    const columnDefinitions = [];
    const columnMap = {
      'name': { header: 'Название сигнала', key: 'name', width: 25 },
      'type': { header: 'Тип сигнала', key: 'type', width: 15 },
      'category': { header: 'Категория', key: 'category', width: 20 },
      'connectionType': { header: 'Тип подключения', key: 'connectionType', width: 20 },
      'voltage': { header: 'Напряжение', key: 'voltage', width: 15 },
      'description': { header: 'Описание', key: 'description', width: 30 },
      'device': { header: 'Устройство', key: 'device', width: 25 },
      'deviceType': { header: 'Тип устройства', key: 'deviceType', width: 20 },
      'count': { header: 'Количество', key: 'count', width: 15 }
    };
    
    // Добавляем только выбранные колонки
    for (const column of columns) {
      if (columnMap[column]) {
        columnDefinitions.push(columnMap[column]);
      }
    }
    
    // Если включено поле ПЛК, добавляем его в таблицу
    if (include_plc) {
      columnDefinitions.push({ header: 'ПЛК', key: 'plc', width: 20 });
    }
    
    worksheet.columns = columnDefinitions;
    
    // Применяем стиль к заголовкам
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Добавляем данные
    for (const deviceSignal of deviceSignals) {
      const rowData: any = {};
      
      // Получаем связанные модели
      const signalData = deviceSignal.get('signal') as Signal | null;
      const deviceData = deviceSignal.get('device') as Device | null;
      
      // Заполняем данные из сигнала
      if (columns.includes('name') && signalData) {
        rowData.name = signalData.name;
      }
      
      if (columns.includes('type') && signalData) {
        rowData.type = signalData.type;
      }
      
      if (columns.includes('category') && signalData) {
        rowData.category = signalData.category;
      }
      
      if (columns.includes('connectionType') && signalData) {
        rowData.connectionType = signalData.connectionType;
      }
      
      if (columns.includes('voltage') && signalData) {
        rowData.voltage = signalData.voltage;
      }
      
      if (columns.includes('description') && signalData) {
        rowData.description = signalData.description;
      }
      
      // Заполняем данные из устройства
      if (columns.includes('device') && deviceData) {
        rowData.device = deviceData.deviceDesignation;
      }
      
      if (columns.includes('deviceType') && deviceData) {
        rowData.deviceType = deviceData.deviceType;
      }
      
      if (columns.includes('count')) {
        rowData.count = deviceSignal.count;
      }
      
      // Добавляем информацию о ПЛК если требуется
      if (include_plc && deviceData) {
        const deviceRefId = deviceData.id;
        rowData.plc = devicePlcMap.get(deviceRefId) || 'Н/Д';
      }
      
      worksheet.addRow(rowData);
    }
    
    // Настройка авто-фильтра
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columnDefinitions.length }
    };
    
    // Устанавливаем заголовки для ответа
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=signals_export_${new Date().toISOString().slice(0, 10)}.xlsx`);

    // Отправляем файл клиенту
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Ошибка при экспорте сигналов в Excel:', error);
    res.status(500).json({ message: 'Ошибка сервера при экспорте сигналов в Excel' });
  }
}; 