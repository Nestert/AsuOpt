# Реализация мультипроектности в AsuOpt

## 📋 Обзор задачи

**Цель**: Добавить возможность работы с несколькими проектами АСУ ТП в рамках одной системы  
**Текущее состояние**: Все устройства хранятся в одной глобальной базе  
**Желаемое состояние**: Каждый проект имеет изолированный набор устройств  

## 🏗 Архитектурные изменения

### 1. Модель данных

#### Новая таблица `Projects`
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code VARCHAR(50) UNIQUE, -- Уникальный код проекта
  status ENUM('active', 'archived', 'template') DEFAULT 'active',
  created_by INTEGER, -- ID пользователя (для будущей аутентификации)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  settings JSON -- Настройки проекта (формат экспорта, шаблоны и т.д.)
);
```

#### Изменения существующих таблиц
```sql
-- Добавляем project_id во все основные таблицы
ALTER TABLE device_references ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE kip ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE zra ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE signals ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE device_type_signals ADD COLUMN project_id INTEGER REFERENCES projects(id);

-- Создаем индексы для производительности
CREATE INDEX idx_device_references_project_id ON device_references(project_id);
CREATE INDEX idx_kip_project_id ON kip(project_id);
CREATE INDEX idx_zra_project_id ON zra(project_id);
CREATE INDEX idx_signals_project_id ON signals(project_id);
```

#### Таблица шаблонов проектов
```sql
CREATE TABLE project_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'water_treatment', 'oil_gas', 'chemical' и т.д.
  template_data JSON, -- Структура устройств и сигналов
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Backend изменения

#### Новая модель Project
```typescript
// server/src/models/Project.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

interface ProjectAttributes {
  id?: number;
  name: string;
  description?: string;
  code: string;
  status: 'active' | 'archived' | 'template';
  createdBy?: number;
  settings?: object;
}

export class Project extends Model<ProjectAttributes> implements ProjectAttributes {
  public id!: number;
  public name!: string;
  public description!: string;
  public code!: string;
  public status!: 'active' | 'archived' | 'template';
  public createdBy!: number;
  public settings!: object;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    Project.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      status: {
        type: DataTypes.ENUM('active', 'archived', 'template'),
        defaultValue: 'active',
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      settings: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'projects',
      timestamps: true,
    });
  }

  public static associate() {
    // Связи с другими моделями
    Project.hasMany(DeviceReference, {
      foreignKey: 'projectId',
      as: 'devices',
    });
    
    Project.hasMany(Signal, {
      foreignKey: 'projectId',
      as: 'signals',
    });
  }
}
```

#### Контроллер проектов
```typescript
// server/src/controllers/projectController.ts
import { Request, Response } from 'express';
import { Project } from '../models/Project';
import { DeviceReference } from '../models/DeviceReference';

export class ProjectController {
  // Получить все проекты
  static async getAllProjects(req: Request, res: Response): Promise<void> {
    try {
      const projects = await Project.findAll({
        where: { status: ['active', 'archived'] },
        order: [['updatedAt', 'DESC']],
        include: [{
          model: DeviceReference,
          as: 'devices',
          attributes: ['id'],
          required: false,
        }],
      });

      const projectsWithStats = projects.map(project => ({
        ...project.toJSON(),
        deviceCount: project.devices?.length || 0,
      }));

      res.json(projectsWithStats);
    } catch (error) {
      console.error('Ошибка при получении проектов:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  // Создать новый проект
  static async createProject(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, code, templateId } = req.body;

      // Проверяем уникальность кода
      const existingProject = await Project.findOne({ where: { code } });
      if (existingProject) {
        res.status(400).json({ message: 'Проект с таким кодом уже существует' });
        return;
      }

      const project = await Project.create({
        name,
        description,
        code,
        status: 'active',
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
      const project = await Project.findByPk(id, {
        include: [{
          model: DeviceReference,
          as: 'devices',
          required: false,
        }],
      });

      if (!project) {
        res.status(404).json({ message: 'Проект не найден' });
        return;
      }

      res.json(project);
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

      await project.update({
        name: name || project.name,
        description: description || project.description,
        status: status || project.status,
        settings: settings || project.settings,
      });

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

      if (force === 'true') {
        // Полное удаление проекта и всех связанных данных
        await DeviceReference.destroy({ where: { projectId: id } });
        await project.destroy();
      } else {
        // Мягкое удаление - архивирование
        await project.update({ status: 'archived' });
      }

      res.json({ message: 'Проект удален' });
    } catch (error) {
      console.error('Ошибка при удалении проекта:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  // Применить шаблон к проекту
  static async applyTemplate(projectId: number, templateId: number): Promise<void> {
    // Логика копирования данных из шаблона
    // Будет реализована позже
  }

  // Экспорт проекта
  static async exportProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const project = await Project.findByPk(id, {
        include: [
          { model: DeviceReference, as: 'devices' },
          // Другие связанные модели
        ],
      });

      if (!project) {
        res.status(404).json({ message: 'Проект не найден' });
        return;
      }

      const exportData = {
        project: project.toJSON(),
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${project.code}_export.json"`);
      res.json(exportData);
    } catch (error) {
      console.error('Ошибка при экспорте проекта:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }
}
```

#### Маршруты проектов
```typescript
// server/src/routes/projectRoutes.ts
import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';

const router = Router();

router.get('/', ProjectController.getAllProjects);
router.post('/', ProjectController.createProject);
router.get('/:id', ProjectController.getProjectById);
router.put('/:id', ProjectController.updateProject);
router.delete('/:id', ProjectController.deleteProject);
router.get('/:id/export', ProjectController.exportProject);

export default router;
```

### 3. Frontend изменения

#### Интерфейсы TypeScript
```typescript
// client/src/interfaces/Project.ts
export interface Project {
  id: number;
  name: string;
  description?: string;
  code: string;
  status: 'active' | 'archived' | 'template';
  createdBy?: number;
  settings?: object;
  createdAt: string;
  updatedAt: string;
  deviceCount?: number;
}

export interface ProjectTemplate {
  id: number;
  name: string;
  description?: string;
  category: string;
  templateData: object;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  code: string;
  templateId?: number;
}
```

#### Сервис для работы с проектами
```typescript
// client/src/services/projectService.ts
import axios from 'axios';
import { Project, CreateProjectRequest } from '../interfaces/Project';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const projectService = {
  // Получить все проекты
  async getAllProjects(): Promise<Project[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects`);
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении проектов:', error);
      throw error;
    }
  },

  // Создать проект
  async createProject(projectData: CreateProjectRequest): Promise<Project> {
    try {
      const response = await axios.post(`${API_BASE_URL}/projects`, projectData);
      return response.data;
    } catch (error) {
      console.error('Ошибка при создании проекта:', error);
      throw error;
    }
  },

  // Получить проект по ID
  async getProjectById(id: number): Promise<Project> {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/${id}`);
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении проекта:', error);
      throw error;
    }
  },

  // Обновить проект
  async updateProject(id: number, projectData: Partial<Project>): Promise<Project> {
    try {
      const response = await axios.put(`${API_BASE_URL}/projects/${id}`, projectData);
      return response.data;
    } catch (error) {
      console.error('Ошибка при обновлении проекта:', error);
      throw error;
    }
  },

  // Удалить проект
  async deleteProject(id: number, force: boolean = false): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/projects/${id}?force=${force}`);
    } catch (error) {
      console.error('Ошибка при удалении проекта:', error);
      throw error;
    }
  },

  // Экспорт проекта
  async exportProject(id: number): Promise<Blob> {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/${id}/export`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Ошибка при экспорте проекта:', error);
      throw error;
    }
  },
};
```

#### Компонент выбора проекта
```typescript
// client/src/components/ProjectSelector.tsx
import React, { useState, useEffect } from 'react';
import { Select, Button, Space, App } from 'antd';
import { PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { Project } from '../interfaces/Project';
import { projectService } from '../services/projectService';

interface ProjectSelectorProps {
  currentProjectId: number | null;
  onProjectChange: (projectId: number | null) => void;
  onManageProjects: () => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  currentProjectId,
  onProjectChange,
  onManageProjects,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const projectList = await projectService.getAllProjects();
      setProjects(projectList.filter(p => p.status === 'active'));
    } catch (error) {
      message.error('Не удалось загрузить список проектов');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (value: number) => {
    onProjectChange(value);
  };

  return (
    <Space>
      <Select
        style={{ minWidth: 200 }}
        placeholder="Выберите проект"
        value={currentProjectId}
        onChange={handleProjectChange}
        loading={loading}
        showSearch
        optionFilterProp="children"
      >
        {projects.map(project => (
          <Select.Option key={project.id} value={project.id}>
            {project.name} ({project.deviceCount || 0} устройств)
          </Select.Option>
        ))}
      </Select>
      
      <Button
        icon={<SettingOutlined />}
        onClick={onManageProjects}
        title="Управление проектами"
      >
        Управление
      </Button>
    </Space>
  );
};

export default ProjectSelector;
```

#### Компонент управления проектами
```typescript
// client/src/components/ProjectManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Form,
  Input,
  Select,
  App,
  Popconfirm,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { Project, CreateProjectRequest } from '../interfaces/Project';
import { projectService } from '../services/projectService';

interface ProjectManagementProps {
  visible: boolean;
  onClose: () => void;
  onProjectCreated?: (project: Project) => void;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({
  visible,
  onClose,
  onProjectCreated,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();

  useEffect(() => {
    if (visible) {
      loadProjects();
    }
  }, [visible]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const projectList = await projectService.getAllProjects();
      setProjects(projectList);
    } catch (error) {
      message.error('Не удалось загрузить проекты');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (values: CreateProjectRequest) => {
    try {
      const newProject = await projectService.createProject(values);
      message.success('Проект создан успешно');
      setCreateModalVisible(false);
      form.resetFields();
      loadProjects();
      onProjectCreated?.(newProject);
    } catch (error) {
      message.error('Не удалось создать проект');
    }
  };

  const handleDeleteProject = async (project: Project) => {
    try {
      await projectService.deleteProject(project.id);
      message.success('Проект удален');
      loadProjects();
    } catch (error) {
      message.error('Не удалось удалить проект');
    }
  };

  const handleExportProject = async (project: Project) => {
    try {
      const blob = await projectService.exportProject(project.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.code}_export.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success('Проект экспортирован');
    } catch (error) {
      message.error('Не удалось экспортировать проект');
    }
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'active' ? 'green' : 'orange';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Устройств',
      dataIndex: 'deviceCount',
      key: 'deviceCount',
    },
    {
      title: 'Обновлен',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, project: Project) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => setEditingProject(project)}
          />
          <Button
            icon={<DownloadOutlined />}
            size="small"
            onClick={() => handleExportProject(project)}
          />
          <Popconfirm
            title="Удалить проект?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDeleteProject(project)}
            okText="Удалить"
            cancelText="Отмена"
          >
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title="Управление проектами"
        open={visible}
        onCancel={onClose}
        width={800}
        footer={[
          <Button key="close" onClick={onClose}>
            Закрыть
          </Button>,
        ]}
      >
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Создать проект
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={projects}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Modal>

      {/* Модальное окно создания проекта */}
      <Modal
        title="Создать новый проект"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Создать"
        cancelText="Отмена"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProject}
        >
          <Form.Item
            name="name"
            label="Название проекта"
            rules={[{ required: true, message: 'Введите название проекта' }]}
          >
            <Input placeholder="Например: Очистные сооружения №1" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Код проекта"
            rules={[
              { required: true, message: 'Введите код проекта' },
              { pattern: /^[A-Z0-9_-]+$/, message: 'Только заглавные буквы, цифры, _ и -' },
            ]}
          >
            <Input placeholder="Например: OS_001" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea
              rows={3}
              placeholder="Краткое описание проекта"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ProjectManagement;
```

## 📋 План реализации

### Этап 1: Подготовка базы данных (1-2 дня)
1. ✅ Создать миграцию для таблицы `projects`
2. ✅ Добавить `project_id` в существующие таблицы
3. ✅ Создать индексы для производительности
4. ✅ Создать дефолтный проект для существующих данных

### Этап 2: Backend API (3-4 дня)
1. ✅ Создать модель `Project`
2. ✅ Реализовать контроллер `ProjectController`
3. ✅ Добавить маршруты для проектов
4. ✅ Обновить существующие API для работы с `project_id`

### Этап 3: Frontend компоненты (4-5 дней)
1. ✅ Создать интерфейсы TypeScript
2. ✅ Реализовать сервис `projectService`
3. ✅ Создать компонент `ProjectSelector`
4. ✅ Создать компонент `ProjectManagement`
5. ✅ Создать контекст `ProjectContext`
6. ✅ Интегрировать в основное приложение

### Этап 4: Интеграция и тестирование (2-3 дня)
1. ⏳ Обновить все существующие компоненты
2. ⏳ Добавить контекст текущего проекта
3. ⏳ Протестировать все функции
4. ⏳ Исправить найденные ошибки

### Этап 5: Дополнительные функции (3-4 дня)
1. ⏳ Шаблоны проектов
2. ⏳ Импорт/экспорт проектов
3. ⏳ Копирование проектов
4. ⏳ Архивирование проектов

## 🎯 Ожидаемые результаты

После реализации мультипроектности пользователи смогут:
- Создавать и управлять несколькими проектами
- Переключаться между проектами в интерфейсе
- Изолированно работать с устройствами каждого проекта
- Экспортировать и импортировать проекты
- Использовать шаблоны для быстрого создания проектов

**Текущий статус:**
- ✅ Этап 1 (База данных) - завершен
- ✅ Этап 2 (Backend API) - завершен  
- ✅ Этап 3 (Frontend компоненты) - завершен
- ⏳ Этап 4 (Интеграция и тестирование) - следующий
- ⏳ Этап 5 (Дополнительные функции)

**Что реализовано:**
- Полная система управления проектами в интерфейсе
- Селектор проектов в шапке приложения
- Модальное окно управления проектами с CRUD операциями
- Контекст для глобального состояния текущего проекта
- Интеграция с основным приложением

**Следующий шаг** - обновление существующих компонентов для работы с проектами. 