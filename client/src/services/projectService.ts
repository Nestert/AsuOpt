import axios from 'axios';
import { Project, CreateProjectRequest, UpdateProjectRequest, ProjectStats } from '../interfaces/Project';

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
  async updateProject(id: number, projectData: UpdateProjectRequest): Promise<Project> {
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

  // Копирование проекта
  async copyProject(id: number, name: string, code: string): Promise<Project> {
    try {
      const response = await axios.post(`${API_BASE_URL}/projects/${id}/copy`, {
        name,
        code,
      });
      return response.data;
    } catch (error) {
      console.error('Ошибка при копировании проекта:', error);
      throw error;
    }
  },

  // Получить статистику проекта
  async getProjectStats(id: number): Promise<ProjectStats> {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/${id}/stats`);
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении статистики проекта:', error);
      throw error;
    }
  },
}; 