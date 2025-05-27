import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';

const router = Router();

// Получить все проекты
router.get('/', ProjectController.getAllProjects);

// Создать новый проект
router.post('/', ProjectController.createProject);

// Получить проект по ID
router.get('/:id', ProjectController.getProjectById);

// Обновить проект
router.put('/:id', ProjectController.updateProject);

// Удалить проект (архивировать или полностью удалить)
router.delete('/:id', ProjectController.deleteProject);

// Экспорт проекта
router.get('/:id/export', ProjectController.exportProject);

// Копирование проекта
router.post('/:id/copy', ProjectController.copyProject);

// Получить статистику проекта
router.get('/:id/stats', ProjectController.getProjectStats);

export default router; 