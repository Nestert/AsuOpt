import express from 'express';
import { Zra } from '../models/Zra';

const router = express.Router();

// Обработчик для обновления ZRA
const updateZraHandler: express.RequestHandler = async (req, res) => {
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
};

// Обновление ZRA по ID
router.put('/:id', updateZraHandler);

export default router; 