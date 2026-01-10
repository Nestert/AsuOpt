import { Request, Response } from 'express';
const puppeteer: any = require('puppeteer');
import { Device } from '../models/Device';
import { DeviceSignal } from '../models/DeviceSignal';
import { Signal } from '../models/Signal';
import { DeviceReference } from '../models/DeviceReference';
import { Kip } from '../models/Kip';
import { Zra } from '../models/Zra';

// Export PDF of signals using Puppeteer
export const exportSignalsToPdfPuppeteer = async (req: Request, res: Response) => {
  try {
    const { columns = [], include_plc = false } = req.body;

    // Fetch signals with related device info
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

    // If PLC info is needed, fetch additional data
    let devicePlcMap = new Map();
    if (include_plc) {
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

      for (const reference of deviceReferences) {
        let plcInfo = reference.plcType || '';
        const kipData = reference.get('kip') as any;
        const zraData = reference.get('zra') as any;

        if (kipData && kipData.plc) {
          plcInfo = kipData.plc;
        } else if (zraData && zraData.plc) {
          plcInfo = zraData.plc;
        }

        devicePlcMap.set(reference.id, plcInfo);
      }
    }

    // Build HTML content for PDF
    const columnHeaders: { [key: string]: string } = {
      'name': 'Название сигнала',
      'type': 'Тип',
      'category': 'Категория',
      'connectionType': 'Тип подключения',
      'voltage': 'Напряжение',
      'description': 'Описание',
      'device': 'Устройство',
      'deviceType': 'Тип устройства',
      'count': 'Количество'
    };

    // Create HTML table
    let html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Экспорт сигналов устройств</title>
    <style>
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            margin: 20px;
            color: #333;
        }
        h1 {
            text-align: center;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .export-info {
            text-align: center;
            margin-bottom: 20px;
            font-size: 14px;
            color: #7f8c8d;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
        }
        th, td {
            border: 1px solid #bdc3c7;
            padding: 8px 12px;
            text-align: left;
            vertical-align: top;
        }
        th {
            background-color: #ecf0f1;
            font-weight: bold;
            color: #2c3e50;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #ecf0f1;
        }
    </style>
</head>
<body>
    <h1>Экспорт сигналов устройств</h1>
    <div class="export-info">
        Дата экспорта: ${new Date().toLocaleString('ru-RU')}<br>
        Выбрано колонок: ${columns.length}${include_plc ? ' (включая ПЛК)' : ''}
    </div>
    <table>
        <thead>
            <tr>`;

    // Add table headers
    columns.forEach(column => {
      if (columnHeaders[column]) {
        html += `<th>${columnHeaders[column]}</th>`;
      }
    });

    if (include_plc) {
      html += `<th>ПЛК</th>`;
    }

    html += `</tr>
        </thead>
        <tbody>`;

    // Add table rows
    for (const deviceSignal of deviceSignals) {
      html += `<tr>`;
      const signalData = deviceSignal.get('signal') as Signal | null;
      const deviceData = deviceSignal.get('device') as Device | null;

      columns.forEach(column => {
        let cellValue = '';

        if (column === 'name' && signalData) {
          cellValue = signalData.name;
        } else if (column === 'type' && signalData) {
          cellValue = signalData.type;
        } else if (column === 'category' && signalData) {
          cellValue = signalData.category || '';
        } else if (column === 'connectionType' && signalData) {
          cellValue = signalData.connectionType || '';
        } else if (column === 'voltage' && signalData) {
          cellValue = signalData.voltage || '';
        } else if (column === 'description' && signalData) {
          cellValue = signalData.description || '';
        } else if (column === 'device' && deviceData) {
          cellValue = deviceData.deviceDesignation;
        } else if (column === 'deviceType' && deviceData) {
          cellValue = deviceData.deviceType;
        } else if (column === 'count') {
          cellValue = deviceSignal.count.toString();
        }

        html += `<td>${cellValue}</td>`;
      });

      if (include_plc && deviceData) {
        const plcInfo = devicePlcMap.get(deviceData.id) || 'Н/Д';
        html += `<td>${plcInfo}</td>`;
      }

      html += `</tr>`;
    }

    html += `
        </tbody>
    </table>
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
      landscape: true,
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      preferCSSPageSize: false
    });

    await browser.close();

    // Send PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=signals_export_${new Date().toISOString().slice(0, 10)}.pdf`);
    res.end(pdfBuffer);

  } catch (error) {
    console.error('Ошибка экспорта PDF через Puppeteer:', error);
    res.status(500).json({ message: 'Ошибка сервера при экспорте сигналов в PDF' });
  }
};

export default exportSignalsToPdfPuppeteer;
