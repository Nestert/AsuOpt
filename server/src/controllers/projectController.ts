import { Request, Response } from 'express';
import { Op, col, fn } from 'sequelize';
import { Project } from '../models/Project';
import { DeviceReference } from '../models/DeviceReference';

type ProjectListQuery = {
  limit?: number;
  offset?: number;
  sort?: 'updatedAt' | 'createdAt' | 'name' | 'code' | 'status';
  order?: 'ASC' | 'DESC';
  q?: string;
};

/**
 * @swagger
 * tags:
 *   - name: Projects
 *     description: Управление проектами
 * /api/projects:
 *   get:
 *     summary: Получить список проектов
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: Список проектов
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *   post:
 *     summary: Создать новый проект
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       201:
 *         description: Проект создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Ошибка валидации (например, дубликат кода)
 * /api/projects/{id}:
 *   get:
 *     summary: Получить проект по ID
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID проекта
 *     responses:
 *       200:
 *         description: Информация о проекте
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       404:
 *         description: Проект не найден
 *   put:
 *     summary: Обновить проект
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID проекта
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       200:
 *         description: Проект обновлен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       404:
 *         description: Проект не найден
 *   delete:
 *     summary: Удалить проект
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID проекта
 *     responses:
 *       200:
 *         description: Проект удален
 *       404:
 *         description: Проект не найден
 */

export class ProjectController {
  // Получить все проекты
  static async getAllProjects(req: Request, res: Response): Promise<void> {
    try {
      const { limit, offset, sort, order, q } = req.query as unknown as ProjectListQuery;
      const hasPagination = typeof limit === 'number' || typeof offset === 'number';

      const where: Record<PropertyKey, unknown> = {
        status: { [Op.in]: ['active', 'archived'] },
      };

      if (q) {
        where[Op.or] = [
          { name: { [Op.like]: `%${q}%` } },
          { code: { [Op.like]: `%${q}%` } },
          { description: { [Op.like]: `%${q}%` } },
        ];
      }

      const sortField = sort ?? 'updatedAt';
      const sortOrder = order ?? 'DESC';

      const queryOptions: {
        where: Record<PropertyKey, unknown>;
        order: Array<[string, 'ASC' | 'DESC']>;
        limit?: number;
        offset?: number;
      } = {
        where,
        order: [[sortField, sortOrder]],
      };

      if (hasPagination) {
        queryOptions.limit = limit ?? 50;
        queryOptions.offset = offset ?? 0;
      }

      const projects = await Project.findAll({
        ...queryOptions,
      });

      const projectIds = projects.map((project) => project.id);
      let deviceCountsByProjectId = new Map<number, number>();

      if (projectIds.length > 0) {
        const counts = (await DeviceReference.findAll({
          attributes: ['projectId', [fn('COUNT', col('id')), 'deviceCount']],
          where: {
            projectId: { [Op.in]: projectIds },
          },
          group: ['projectId'],
          raw: true,
        })) as unknown as Array<{ projectId: number; deviceCount: number | string }>;

        deviceCountsByProjectId = new Map(
          counts.map((row) => [
            Number(row.projectId),
            typeof row.deviceCount === 'number' ? row.deviceCount : Number(row.deviceCount) || 0,
          ])
        );
      }

      const projectsWithStats = projects.map((project) => ({
        ...project.toJSON(),
        deviceCount: deviceCountsByProjectId.get(project.id) ?? 0,
      }));

      if (hasPagination) {
        const total = await Project.count({ where });
        res.json({
          items: projectsWithStats,
          total,
          limit: queryOptions.limit,
          offset: queryOptions.offset,
        });
        return;
      }

      res.json(projectsWithStats);
    } catch (error) {
      console.error('Ошибка при получении проектов:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  // Создать новый проект
  static async createProject(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, code, templateId, settings } = req.body;

      // Валидация обязательных полей
      if (!name || !code) {
        res.status(400).json({ message: 'Название и код проекта обязательны' });
        return;
      }

      // Проверяем уникальность кода
      const existingProject = await Project.findOne({ where: { code } });
      if (existingProject) {
        res.status(400).json({ message: 'Проект с таким кодом уже существует' });
        return;
      }

      const project = await Project.create({
        name,
        description,
        code: code.toUpperCase(), // Приводим к верхнему регистру
        status: 'active',
        settings: settings ? JSON.stringify(settings) : null,
        // createdBy: req.user?.id, // Для будущей аутентификации
      });

      // Если указан шаблон, копируем данные из него
      if (templateId) {
        await ProjectController.applyTemplate(project.id, templateId);
      }

      res.status(201).json(project);
    } catch (error) {
      console.error('Ошибка при создании проекта:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  // Получить проект по ID
  static async getProjectById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const project = await Project.findByPk(id);

      if (!project) {
        res.status(404).json({ message: 'Проект не найден' });
        return;
      }

      // Получаем статистику по проекту
      const deviceCount = await DeviceReference.count({
        where: { projectId: project.id },
      });

      const projectWithStats = {
        ...project.toJSON(),
        deviceCount,
      };

      res.json(projectWithStats);
    } catch (error) {
      console.error('Ошибка при получении проекта:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  // Обновить проект
  static async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, status, settings } = req.body;

      const project = await Project.findByPk(id);
      if (!project) {
        res.status(404).json({ message: 'Проект не найден' });
        return;
      }

      // Подготавливаем данные для обновления
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;
      if (settings !== undefined) {
        updateData.settings = settings ? JSON.stringify(settings) : null;
      }

      await project.update(updateData);

      res.json(project);
    } catch (error) {
      console.error('Ошибка при обновлении проекта:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  // Удалить проект
  static async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { force = false } = req.query;

      const project = await Project.findByPk(id);
      if (!project) {
        res.status(404).json({ message: 'Проект не найден' });
        return;
      }

      // Проверяем, что это не дефолтный проект
      if (project.code === 'DEFAULT') {
        res.status(400).json({ message: 'Нельзя удалить основной проект' });
        return;
      }

      if (force === 'true') {
        // Полное удаление проекта и всех связанных данных
        const deviceCount = await DeviceReference.count({
          where: { projectId: id },
        });

        if (deviceCount > 0) {
          res.status(400).json({ 
            message: `Нельзя удалить проект с устройствами (${deviceCount} устройств). Сначала удалите все устройства или используйте архивирование.` 
          });
          return;
        }

        await project.destroy();
        res.json({ message: 'Проект полностью удален' });
      } else {
        // Мягкое удаление - архивирование
        await project.update({ status: 'archived' });
        res.json({ message: 'Проект архивирован' });
      }
    } catch (error) {
      console.error('Ошибка при удалении проекта:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  // Применить шаблон к проекту
  static async applyTemplate(projectId: number, templateId: number): Promise<void> {
    // TODO: Логика копирования данных из шаблона
    // Будет реализована в следующих этапах
    console.log(`Применение шаблона ${templateId} к проекту ${projectId} - пока не реализовано`);
  }

  // Экспорт проекта
  static async exportProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const project = await Project.findByPk(id);

      if (!project) {
        res.status(404).json({ message: 'Проект не найден' });
        return;
      }

      // Получаем все связанные данные
      const devices = await DeviceReference.findAll({
        where: { projectId: id },
      });

      const exportData = {
        project: {
          ...project.toJSON(),
          settingsObject: project.settingsObject, // Добавляем распарсенные настройки
        },
        devices,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        deviceCount: devices.length,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${project.code}_export.json"`);
      res.json(exportData);
    } catch (error) {
      console.error('Ошибка при экспорте проекта:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  // Копирование проекта
  static async copyProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, code } = req.body;

      if (!name || !code) {
        res.status(400).json({ message: 'Название и код нового проекта обязательны' });
        return;
      }

      // Проверяем существование исходного проекта
      const sourceProject = await Project.findByPk(id);
      if (!sourceProject) {
        res.status(404).json({ message: 'Исходный проект не найден' });
        return;
      }

      // Проверяем уникальность кода
      const existingProject = await Project.findOne({ where: { code: code.toUpperCase() } });
      if (existingProject) {
        res.status(400).json({ message: 'Проект с таким кодом уже существует' });
        return;
      }

      // Создаем новый проект
      const newProject = await Project.create({
        name,
        code: code.toUpperCase(),
        description: `Копия проекта "${sourceProject.name}"`,
        status: 'active',
        settings: sourceProject.settings,
      });

      // TODO: Копируем устройства и другие связанные данные
      // Это будет реализовано в следующих этапах

      res.status(201).json(newProject);
    } catch (error) {
      console.error('Ошибка при копировании проекта:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  // Получить статистику проекта
  static async getProjectStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const project = await Project.findByPk(id);
      if (!project) {
        res.status(404).json({ message: 'Проект не найден' });
        return;
      }

      // Собираем статистику
      const deviceCount = await DeviceReference.count({
        where: { projectId: id },
      });

      // TODO: Добавить статистику по сигналам, типам устройств и т.д.
      // когда будут обновлены соответствующие модели

      const stats = {
        projectId: id,
        projectName: project.name,
        deviceCount,
        // signalCount: 0, // TODO
        // deviceTypeCount: 0, // TODO
        lastUpdated: project.updatedAt,
      };

      res.json(stats);
    } catch (error) {
      console.error('Ошибка при получении статистики проекта:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }
} 
