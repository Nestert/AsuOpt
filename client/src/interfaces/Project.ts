export interface Project {
  id: number;
  name: string;
  description?: string;
  code: string;
  status: 'active' | 'archived' | 'template';
  createdBy?: number;
  settings?: string; // JSON строка
  createdAt: string;
  updatedAt: string;
  deviceCount?: number;
}

export interface ProjectTemplate {
  id: number;
  name: string;
  description?: string;
  category: string;
  templateData: string; // JSON строка
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  code: string;
  templateId?: number;
  settings?: object;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'archived' | 'template';
  settings?: object;
}

export interface ProjectStats {
  projectId: number;
  projectName: string;
  deviceCount: number;
  signalCount?: number;
  deviceTypeCount?: number;
  lastUpdated: string;
} 