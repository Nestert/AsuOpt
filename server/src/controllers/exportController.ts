import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { Device } from '../models/Device';

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