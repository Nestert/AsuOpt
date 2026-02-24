import express from 'express';
import { Zra } from '../models/Zra';

const router = express.Router();

// Получение всех записей ЗРА
router.get('/', async (req, res) => {
  try {
    const zras = await Zra.findAll({
      include: [{
        model: require('../models/DeviceReference').DeviceReference,
        as: 'deviceReference',
        required: false
      }]
    });
    res.json(zras);
  } catch (error: any) {
    console.error('Ошибка при получении ЗРА:', error);
    res.status(500).json({
      message: 'Ошибка при получении данных ЗРА',
      error: error.message
    });
  }
});

// Получение ЗРА по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const zra = await Zra.findByPk(id, {
      include: [{
        model: require('../models/DeviceReference').DeviceReference,
        as: 'deviceReference',
        required: false
      }]
    });

    if (!zra) {
      res.status(404).json({ message: 'ЗРА не найден' });
      return;
    }

    res.json(zra);
  } catch (error: any) {
    console.error('Ошибка при получении ЗРА:', error);
    res.status(500).json({
      message: 'Ошибка при получении ЗРА',
      error: error.message
    });
  }
});

// Обновление ЗРА по ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const zra = await Zra.findByPk(id);

    if (!zra) {
      res.status(404).json({ message: 'ЗРА не найден' });
      return;
    }

    await zra.update(updateData);

    res.json({
      message: 'Данные ЗРА успешно обновлены',
      zra
    });
  } catch (error: any) {
    console.error('Ошибка при обновлении ЗРА:', error);
    res.status(500).json({
      message: 'Ошибка при обновлении ЗРА',
      error: error.message
    });
  }
});

export default router;