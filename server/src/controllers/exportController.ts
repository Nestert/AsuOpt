import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { Device } from '../models/Device';
import { DeviceSignal } from '../models/DeviceSignal';
import { Signal } from '../models/Signal';
import { DeviceReference } from '../models/DeviceReference';
import { Kip } from '../models/Kip';
import { Zra } from '../models/Zra';
import { Document, Packer, Paragraph } from 'docx';
const puppeteer: any = require('puppeteer');

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

// Генерация опросных листов
export const generateQuestionnaire = async (req: Request, res: Response) => {
  try {
    const { devices, format } = req.body;

    if (!devices || !Array.isArray(devices)) {
      return res.status(400).json({ message: 'Не переданы данные устройств' });
    }

    if (format === 'pdf') {
      // Генерация PDF с помощью Puppeteer
      let html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Опросный лист</title>
    <style>
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.6;
        }
        h1 {
            text-align: center;
            color: #2c3e50;
            margin-bottom: 20px;
        }
        h2 {
            color: #34495e;
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
            margin-top: 30px;
        }
        h3 {
            color: #34495e;
            margin-top: 20px;
        }
        p {
            margin: 5px 0;
        }
        .device {
            margin-bottom: 40px;
        }
        .specs {
            margin-left: 20px;
        }
        .spec-item {
            margin: 3px 0;
        }
    </style>
</head>
<body>
    <h1>Опросный лист для закупки оборудования</h1>
    <div class="export-info">
        Дата генерации: ${new Date().toLocaleString('ru-RU')}<br>
    </div>`;

      // Словари русских названий полей КИП и ЗРА
      const kipFieldLabels: Record<string, string> = {
        section: 'Секция',
        unitArea: 'Установка/Зона',
        manufacturer: 'Производитель',
        article: 'Артикул',
        measureUnit: 'Единица измерения',
        scale: 'Шкала',
        note: 'Примечание',
        docLink: 'Ссылка на документацию',
        responsibilityZone: 'Зона ответственности',
        connectionScheme: 'Схема подключения',
        power: 'Питание',
        plc: 'ПЛК',
        exVersion: 'Ex-версия',
        environmentCharacteristics: 'Характеристики окружающей среды',
        signalPurpose: 'Назначение сигнала',
        controlPoints: 'Контрольные точки',
        completeness: 'Комплектность',
        measuringLimits: 'Пределы измерений',
      };

      const zraFieldLabels: Record<string, string> = {
        unitArea: 'Установка/Зона',
        designType: 'Тип конструкции',
        valveType: 'Тип клапана',
        actuatorType: 'Тип привода',
        pipePosition: 'Положение трубы',
        nominalDiameter: 'Номинальный диаметр',
        pressureRating: 'Номинальное давление',
        pipeMaterial: 'Материал трубы',
        medium: 'Среда',
        positionSensor: 'Датчик положения',
        solenoidType: 'Тип соленоида',
        emergencyPosition: 'Аварийное положение',
        controlPanel: 'Панель управления',
        airConsumption: 'Расход воздуха',
        connectionSize: 'Размер соединения',
        fittingsCount: 'Количество фитингов',
        tubeDiameter: 'Диаметр трубы',
        limitSwitchType: 'Тип концевого выключателя',
        positionerType: 'Тип позиционера',
        deviceDescription: 'Описание устройства',
        category: 'Категория',
        plc: 'ПЛК',
        exVersion: 'Ex-версия',
        operation: 'Управление',
        note: 'Примечание',
      };

      const excludedKeys = new Set(['id', 'deviceReferenceId', 'createdAt', 'updatedAt']);

      devices.forEach((deviceData: any, index: number) => {
        const { device, kip, zra } = deviceData;

        html += `
    <div class="device">
        <h2>Устройство ${index + 1}: ${device.posDesignation || device.equipmentCode || ''}</h2>
        <div class="specs">
            <p><strong>Тип устройства:</strong> ${device.deviceType || 'Н/Д'}</p>
            <p><strong>Описание:</strong> ${device.description || 'Н/Д'}</p>
            <p><strong>Код системы:</strong> ${device.systemCode || 'Н/Д'}</p>
            <p><strong>Родительская система:</strong> ${device.parentSystem || 'Н/Д'}</p>
            <p><strong>Тип ПЛК:</strong> ${device.plcType || 'Н/Д'}</p>
            <p><strong>Ex-версия:</strong> ${device.exVersion || 'Н/Д'}</p>`;

        if (kip) {
          html += `
            <h3>Технические данные КИП:</h3>`;
          Object.entries(kip).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '' && !excludedKeys.has(key)) {
              const label = kipFieldLabels[key] || key;
              html += `<p class="spec-item"><strong>${label}:</strong> ${value}</p>`;
            }
          });
        } else if (zra) {
          html += `
            <h3>Технические данные ЗРА:</h3>`;
          Object.entries(zra).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '' && !excludedKeys.has(key)) {
              const label = zraFieldLabels[key] || key;
              html += `<p class="spec-item"><strong>${label}:</strong> ${value}</p>`;
            }
          });
        }

        html += `
        </div>
    </div>`;
      });

      html += `
</body>
</html>`;

      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        preferCSSPageSize: false
      });

      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=questionnaire_${new Date().toISOString().slice(0, 10)}.pdf`);
      res.send(pdfBuffer);
    } else if (format === 'word') {
      // Генерация Word
      const paragraphs: Paragraph[] = [];

      // Словари русских названий полей КИП и ЗРА (Word)
      const kipFieldLabelsWord: Record<string, string> = {
        section: 'Секция',
        unitArea: 'Установка/Зона',
        manufacturer: 'Производитель',
        article: 'Артикул',
        measureUnit: 'Единица измерения',
        scale: 'Шкала',
        note: 'Примечание',
        docLink: 'Ссылка на документацию',
        responsibilityZone: 'Зона ответственности',
        connectionScheme: 'Схема подключения',
        power: 'Питание',
        plc: 'ПЛК',
        exVersion: 'Ex-версия',
        environmentCharacteristics: 'Характеристики окружающей среды',
        signalPurpose: 'Назначение сигнала',
        controlPoints: 'Контрольные точки',
        completeness: 'Комплектность',
        measuringLimits: 'Пределы измерений',
      };

      const zraFieldLabelsWord: Record<string, string> = {
        unitArea: 'Установка/Зона',
        designType: 'Тип конструкции',
        valveType: 'Тип клапана',
        actuatorType: 'Тип привода',
        pipePosition: 'Положение трубы',
        nominalDiameter: 'Номинальный диаметр',
        pressureRating: 'Номинальное давление',
        pipeMaterial: 'Материал трубы',
        medium: 'Среда',
        positionSensor: 'Датчик положения',
        solenoidType: 'Тип соленоида',
        emergencyPosition: 'Аварийное положение',
        controlPanel: 'Панель управления',
        airConsumption: 'Расход воздуха',
        connectionSize: 'Размер соединения',
        fittingsCount: 'Количество фитингов',
        tubeDiameter: 'Диаметр трубы',
        limitSwitchType: 'Тип концевого выключателя',
        positionerType: 'Тип позиционера',
        deviceDescription: 'Описание устройства',
        category: 'Категория',
        plc: 'ПЛК',
        exVersion: 'Ex-версия',
        operation: 'Управление',
        note: 'Примечание',
      };

      const excludedKeysWord = new Set(['id', 'deviceReferenceId', 'createdAt', 'updatedAt']);

      paragraphs.push(new Paragraph({
        text: 'Опросный лист для закупки оборудования',
        heading: 'Title',
      }));

      devices.forEach((deviceData: any, index: number) => {
        const { device, kip, zra } = deviceData;

        paragraphs.push(new Paragraph({
          text: `Устройство ${index + 1}: ${device.posDesignation || device.equipmentCode || ''}`,
          heading: 'Heading1',
        }));

        // Основные данные
        paragraphs.push(new Paragraph(`Тип устройства: ${device.deviceType || 'Н/Д'}`));
        paragraphs.push(new Paragraph(`Описание: ${device.description || 'Н/Д'}`));
        paragraphs.push(new Paragraph(`Код системы: ${device.systemCode || 'Н/Д'}`));
        paragraphs.push(new Paragraph(`Родительская система: ${device.parentSystem || 'Н/Д'}`));
        paragraphs.push(new Paragraph(`Тип ПЛК: ${device.plcType || 'Н/Д'}`));
        paragraphs.push(new Paragraph(`Ex-версия: ${device.exVersion || 'Н/Д'}`));

        // Техданные
        if (kip) {
          paragraphs.push(new Paragraph({
            text: 'Технические данные КИП:',
            heading: 'Heading2',
          }));

          Object.entries(kip).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '' && !excludedKeysWord.has(key)) {
              const label = kipFieldLabelsWord[key] || key;
              paragraphs.push(new Paragraph(`${label}: ${value}`));
            }
          });
        } else if (zra) {
          paragraphs.push(new Paragraph({
            text: 'Технические данные ЗРА:',
            heading: 'Heading2',
          }));

          Object.entries(zra).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '' && !excludedKeysWord.has(key)) {
              const label = zraFieldLabelsWord[key] || key;
              paragraphs.push(new Paragraph(`${label}: ${value}`));
            }
          });
        }
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs,
        }],
      });

      const buffer = await Packer.toBuffer(doc);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=questionnaire_${new Date().toISOString().slice(0, 10)}.docx`);
      res.send(buffer);
    } else {
      return res.status(400).json({ message: 'Неподдерживаемый формат. Используйте "pdf" или "word"' });
    }
  } catch (error) {
    console.error('Ошибка при генерации опросного листа:', error);
    res.status(500).json({ message: 'Ошибка сервера при генерации опросного листа' });
  }
};

