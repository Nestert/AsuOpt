import { Request, Response } from 'express';
import { SignalType } from '../models/SignalType';

// Получение всех типов сигналов
export const getAllSignalTypes = async (req: Request, res: Response) => {
  try {
    const types = await SignalType.findAll({ order: [['id', 'ASC']] });
    res.status(200).json(types);
  } catch (error) {
    console.error('Ошибка при получении типов сигналов:', error);
    res.status(500).json({ error: 'Ошибка при получении типов сигналов' });
  }
};

// Создание типа сигнала
export const createSignalType = async (req: Request, res: Response) => {
  try {
    const { code, name, description, category } = req.body;
    const existing = await SignalType.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: 'Тип сигнала с таким кодом уже существует' });
    }
    const type = await SignalType.create({ code, name, description, category });
    res.status(201).json(type);
  } catch (error) {
    console.error('Ошибка при создании типа сигнала:', error);
    res.status(500).json({ error: 'Ошибка при создании типа сигнала' });
  }
};

// Обновление типа сигнала
export const updateSignalType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const type = await SignalType.findByPk(id);
    if (!type) {
      return res.status(404).json({ error: 'Тип сигнала не найден' });
    }
    const { code, name, description, category } = req.body;
    if (code && code !== type.code) {
      const exists = await SignalType.findOne({ where: { code } });
      if (exists) {
        return res.status(400).json({ error: 'Тип сигнала с таким кодом уже существует' });
      }
    }
    await type.update({ code: code ?? type.code, name: name ?? type.name, description, category });
    res.status(200).json(type);
  } catch (error) {
    console.error('Ошибка при обновлении типа сигнала:', error);
    res.status(500).json({ error: 'Ошибка при обновлении типа сигнала' });
  }
};

// Удаление типа сигнала
export const deleteSignalType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const type = await SignalType.findByPk(id);
    if (!type) {
      return res.status(404).json({ error: 'Тип сигнала не найден' });
    }
    await type.destroy();
    res.status(200).json({ message: 'Тип сигнала удален' });
  } catch (error) {
    console.error('Ошибка при удалении типа сигнала:', error);
    res.status(500).json({ error: 'Ошибка при удалении типа сигнала' });
  }
};
