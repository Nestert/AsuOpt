import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import {
  idParamSchema,
  projectCreateBodySchema,
  projectDeleteQuerySchema,
  projectListQuerySchema,
  projectUpdateBodySchema,
} from '../validation/schemas';

const router = Router();

router.use(authenticateToken);

// Получить все проекты
router.get('/', validateQuery(projectListQuerySchema), ProjectController.getAllProjects);

// Создать новый проект
router.post('/', validateBody(projectCreateBodySchema), ProjectController.createProject);

// Получить проект по ID
router.get('/:id', validateParams(idParamSchema), ProjectController.getProjectById);

// Обновить проект
router.put('/:id', validateParams(idParamSchema), validateBody(projectUpdateBodySchema), ProjectController.updateProject);

// Удалить проект (архивировать или полностью удалить)
router.delete('/:id', validateParams(idParamSchema), validateQuery(projectDeleteQuerySchema), ProjectController.deleteProject);

// Экспорт проекта
router.get('/:id/export', validateParams(idParamSchema), ProjectController.exportProject);

// Копирование проекта
router.post('/:id/copy', validateParams(idParamSchema), ProjectController.copyProject);

// Получить статистику проекта
router.get('/:id/stats', validateParams(idParamSchema), ProjectController.getProjectStats);

export default router; 
