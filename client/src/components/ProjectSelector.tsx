import React, { useState, useEffect } from 'react';
import { Select, Button, Space, App } from 'antd';
import { SettingOutlined, FolderOutlined } from '@ant-design/icons';
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
      
      // Если нет выбранного проекта, выбираем первый активный
      if (!currentProjectId && projectList.length > 0) {
        const defaultProject = projectList.find(p => p.code === 'DEFAULT') || projectList[0];
        onProjectChange(defaultProject.id);
      }
    } catch (error) {
      message.error('Не удалось загрузить список проектов');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (value: number) => {
    onProjectChange(value);
  };

  const getCurrentProject = () => {
    return projects.find(p => p.id === currentProjectId);
  };

  return (
    <Space>
      <FolderOutlined style={{ color: '#1677ff' }} />
      <Select
        style={{ minWidth: 250 }}
        placeholder="Выберите проект"
        value={currentProjectId}
        onChange={handleProjectChange}
        loading={loading}
        showSearch
        optionFilterProp="children"
        filterOption={(input, option) =>
          (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
        }
      >
        {projects.map(project => (
          <Select.Option key={project.id} value={project.id}>
            <Space>
              <span>{project.name}</span>
              <span style={{ color: '#666', fontSize: '12px' }}>
                ({project.deviceCount || 0} устройств)
              </span>
            </Space>
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
      
      {getCurrentProject() && (
        <span style={{ color: '#666', fontSize: '12px' }}>
          Код: {getCurrentProject()?.code}
        </span>
      )}
    </Space>
  );
};

export default ProjectSelector;
