import express from 'express';
import { Kip } from '../models/Kip';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Получение всех записей КИП
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    const whereCondition: any = {};
    
    if (projectId) {
      whereCondition.projectId = parseInt(projectId as string, 10);
    }
    
    const kips = await Kip.findAll({
      where: whereCondition,
      include: [{
        model: require('../models/DeviceReference').DeviceReference,
        as: 'deviceReference',
        required: false
      }]
    });
    res.json(kips);
  } catch (error: any) {
    console.error('Ошибка при получении КИП:', error);
    res.status(500).json({
      message: 'Ошибка при получении данных КИП',
      error: error.message
    });
  }
});

// Получение КИП по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const kip = await Kip.findByPk(id, {
      include: [{
        model: require('../models/DeviceReference').DeviceReference,
        as: 'deviceReference',
        required: false
      }]
    });

    if (!kip) {
      res.status(404).json({ message: 'КИП не найден' });
      return;
    }

    res.json(kip);
  } catch (error: any) {
    console.error('Ошибка при получении КИП:', error);
    res.status(500).json({
      message: 'Ошибка при получении КИП',
      error: error.message
    });
  }
});

// Обработчик для обновления KIP
const updateKipHandler: express.RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const kip = await Kip.findByPk(id);

    if (!kip) {
      res.status(404).json({ message: 'КИП не найден' });
      return;
    }

    await kip.update(updateData);

    res.json({
      message: 'Данные КИП успешно обновлены',
      kip
    });
  } catch (error: any) {
    console.error('Ошибка при обновлении КИП:', error);
    res.status(500).json({
      message: 'Ошибка при обновлении КИП',
      error: error.message
    });
  }
};

// Обновление KIP по ID
router.put('/:id', updateKipHandler);

export default router; 
