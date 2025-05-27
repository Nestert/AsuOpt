import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Form,
  Input,
  App,
  Popconfirm,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  CopyOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { Project, CreateProjectRequest, UpdateProjectRequest } from '../interfaces/Project';
import { projectService } from '../services/projectService';

const { Text } = Typography;

interface ProjectManagementProps {
  visible: boolean;
  onClose: () => void;
  onProjectCreated?: (project: Project) => void;
  currentProjectId?: number | null;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({
  visible,
  onClose,
  onProjectCreated,
  currentProjectId,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [copyingProject, setCopyingProject] = useState<Project | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [copyForm] = Form.useForm();
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
      createForm.resetFields();
      loadProjects();
      onProjectCreated?.(newProject);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Не удалось создать проект';
      message.error(errorMessage);
    }
  };

  const handleEditProject = async (values: UpdateProjectRequest) => {
    if (!editingProject) return;
    
    try {
      await projectService.updateProject(editingProject.id, values);
      message.success('Проект обновлен успешно');
      setEditModalVisible(false);
      setEditingProject(null);
      editForm.resetFields();
      loadProjects();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Не удалось обновить проект';
      message.error(errorMessage);
    }
  };

  const handleCopyProject = async (values: { name: string; code: string }) => {
    if (!copyingProject) return;
    
    try {
      const newProject = await projectService.copyProject(
        copyingProject.id,
        values.name,
        values.code
      );
      message.success('Проект скопирован успешно');
      setCopyModalVisible(false);
      setCopyingProject(null);
      copyForm.resetFields();
      loadProjects();
      onProjectCreated?.(newProject);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Не удалось скопировать проект';
      message.error(errorMessage);
    }
  };

  const handleDeleteProject = async (project: Project, force: boolean = false) => {
    try {
      await projectService.deleteProject(project.id, force);
      message.success(force ? 'Проект полностью удален' : 'Проект архивирован');
      loadProjects();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Не удалось удалить проект';
      message.error(errorMessage);
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

  const showEditModal = (project: Project) => {
    setEditingProject(project);
    editForm.setFieldsValue({
      name: project.name,
      description: project.description,
      status: project.status,
    });
    setEditModalVisible(true);
  };

  const showCopyModal = (project: Project) => {
    setCopyingProject(project);
    copyForm.setFieldsValue({
      name: `Копия ${project.name}`,
      code: `${project.code}_COPY`,
    });
    setCopyModalVisible(true);
  };

  const confirmDelete = (project: Project) => {
    if (project.code === 'DEFAULT') {
      message.warning('Нельзя удалить основной проект');
      return;
    }

    modal.confirm({
      title: 'Удалить проект?',
      content: (
        <div>
          <p>Проект: <strong>{project.name}</strong></p>
          <p>Устройств: <strong>{project.deviceCount || 0}</strong></p>
          <p>Выберите тип удаления:</p>
        </div>
      ),
      okText: 'Архивировать',
      cancelText: 'Отмена',
      onOk: () => handleDeleteProject(project, false),
      footer: (_, { OkBtn, CancelBtn }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            danger
            onClick={() => {
              modal.confirm({
                title: 'Полное удаление проекта',
                content: 'Это действие нельзя отменить. Все данные проекта будут удалены безвозвратно.',
                okText: 'Удалить полностью',
                okType: 'danger',
                cancelText: 'Отмена',
                onOk: () => handleDeleteProject(project, true),
              });
            }}
          >
            Удалить полностью
          </Button>
          <Space>
            <CancelBtn />
            <OkBtn />
          </Space>
        </div>
      ),
    });
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Project) => (
        <Space direction="vertical" size={0}>
          <Text strong={record.id === currentProjectId}>
            {text}
            {record.id === currentProjectId && (
              <Tag color="blue" style={{ marginLeft: 8, fontSize: '12px' }}>
                Текущий
              </Tag>
            )}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const color = status === 'active' ? 'green' : status === 'archived' ? 'orange' : 'blue';
        const text = status === 'active' ? 'Активный' : status === 'archived' ? 'Архив' : 'Шаблон';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Устройств',
      dataIndex: 'deviceCount',
      key: 'deviceCount',
      width: 100,
      render: (count: number) => (
        <Text>{count || 0}</Text>
      ),
    },
    {
      title: 'Обновлен',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      render: (date: string) => (
        <Text style={{ fontSize: '12px' }}>
          {new Date(date).toLocaleDateString('ru-RU')}
        </Text>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_: any, project: Project) => (
        <Space size="small">
          <Tooltip title="Статистика">
            <Button
              icon={<BarChartOutlined />}
              size="small"
              onClick={() => {
                // TODO: Показать статистику проекта
                message.info('Статистика проекта - в разработке');
              }}
            />
          </Tooltip>
          
          <Tooltip title="Редактировать">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => showEditModal(project)}
            />
          </Tooltip>
          
          <Tooltip title="Копировать">
            <Button
              icon={<CopyOutlined />}
              size="small"
              onClick={() => showCopyModal(project)}
            />
          </Tooltip>
          
          <Tooltip title="Экспорт">
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => handleExportProject(project)}
            />
          </Tooltip>
          
          <Tooltip title="Удалить">
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              disabled={project.code === 'DEFAULT'}
              onClick={() => confirmDelete(project)}
            />
          </Tooltip>
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
        width={1000}
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
          pagination={{ pageSize: 10, showSizeChanger: true }}
          size="small"
        />
      </Modal>

      {/* Модальное окно создания проекта */}
      <Modal
        title="Создать новый проект"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        okText="Создать"
        cancelText="Отмена"
      >
        <Form
          form={createForm}
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

      {/* Модальное окно редактирования проекта */}
      <Modal
        title="Редактировать проект"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingProject(null);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditProject}
        >
          <Form.Item
            name="name"
            label="Название проекта"
            rules={[{ required: true, message: 'Введите название проекта' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно копирования проекта */}
      <Modal
        title="Копировать проект"
        open={copyModalVisible}
        onCancel={() => {
          setCopyModalVisible(false);
          setCopyingProject(null);
          copyForm.resetFields();
        }}
        onOk={() => copyForm.submit()}
        okText="Копировать"
        cancelText="Отмена"
      >
        <Form
          form={copyForm}
          layout="vertical"
          onFinish={handleCopyProject}
        >
          <Form.Item
            name="name"
            label="Название нового проекта"
            rules={[{ required: true, message: 'Введите название проекта' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="code"
            label="Код нового проекта"
            rules={[
              { required: true, message: 'Введите код проекта' },
              { pattern: /^[A-Z0-9_-]+$/, message: 'Только заглавные буквы, цифры, _ и -' },
            ]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ProjectManagement; 