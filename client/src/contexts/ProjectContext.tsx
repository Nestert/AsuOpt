import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Project } from '../interfaces/Project';
import { projectService } from '../services/projectService';

interface ProjectContextType {
  currentProject: Project | null;
  currentProjectId: number | null;
  projects: Project[];
  loading: boolean;
  setCurrentProjectId: (projectId: number | null) => void;
  refreshProjects: () => Promise<void>;
  refreshCurrentProject: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentProjectId, setCurrentProjectIdState] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // Установка текущего проекта
  const setCurrentProjectId = useCallback((projectId: number | null) => {
    setCurrentProjectIdState(projectId);
    
    // Сохраняем в localStorage
    if (projectId) {
      localStorage.setItem('currentProjectId', projectId.toString());
    } else {
      localStorage.removeItem('currentProjectId');
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    try {
      setLoading(true);
      const projectList = await projectService.getAllProjects();
      setProjects(projectList);
      
      // Если нет выбранного проекта, выбираем дефолтный
      if (!currentProjectId && projectList.length > 0) {
        const defaultProject = projectList.find(p => p.code === 'DEFAULT') || projectList[0];
        setCurrentProjectId(defaultProject.id);
      }
    } catch (error) {
      console.error('Ошибка при загрузке проектов:', error);
    } finally {
      setLoading(false);
    }
  }, [currentProjectId, setCurrentProjectId]);

  const refreshCurrentProject = useCallback(async () => {
    if (currentProjectId) {
      try {
        const project = await projectService.getProjectById(currentProjectId);
        setCurrentProject(project);
      } catch (error) {
        console.error('Ошибка при загрузке текущего проекта:', error);
        setCurrentProject(null);
      }
    } else {
      setCurrentProject(null);
    }
  }, [currentProjectId]);

  // Загружаем список проектов при монтировании
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Загружаем данные текущего проекта при изменении currentProjectId
  useEffect(() => {
    refreshCurrentProject();
  }, [currentProjectId, refreshCurrentProject]);

  // Инициализация при загрузке
  useEffect(() => {
    // Восстанавливаем из localStorage
    const savedProjectId = localStorage.getItem('currentProjectId');
    if (savedProjectId) {
      setCurrentProjectIdState(parseInt(savedProjectId, 10));
    }
  }, []);

  const value: ProjectContextType = {
    currentProject,
    currentProjectId,
    projects,
    loading,
    setCurrentProjectId,
    refreshProjects,
    refreshCurrentProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

// Хук для использования контекста
export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject должен использоваться внутри ProjectProvider');
  }
  return context;
}; 