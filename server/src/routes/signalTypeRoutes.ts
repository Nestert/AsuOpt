import express from 'express';
import * as controller from '../controllers/signalTypeController';

const router = express.Router();

router.get('/', controller.getAllSignalTypes);
router.post('/', controller.createSignalType);
router.put('/:id', controller.updateSignalType);
router.delete('/:id', controller.deleteSignalType);

export default router;
