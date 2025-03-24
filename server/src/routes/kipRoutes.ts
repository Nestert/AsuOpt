import express from 'express';
import { Kip } from '../models/Kip';

const router = express.Router();

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