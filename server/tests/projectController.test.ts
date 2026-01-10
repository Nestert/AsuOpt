import request from 'supertest';
import express from 'express';
import projectRoutes from '../src/routes/projectRoutes';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/projects', projectRoutes);
  return app;
};

describe('Project API', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = createTestApp();
  });

  describe('GET /api/projects', () => {
    it('should return array of projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Должен быть хотя бы дефолтный проект
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        code: 'TEST001',
        description: 'Project for testing'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(projectData.name);
      expect(response.body.code).toBe(projectData.code);
    });

    it('should return 400 for duplicate code', async () => {
      // Сначала создаем проект
      await request(app)
        .post('/api/projects')
        .send({
          name: 'First Project',
          code: 'DUPLICATE_TEST',
          description: 'First project for duplicate test'
        });

      // Теперь пытаемся создать еще один с тем же кодом
      const projectData = {
        name: 'Second Project',
        code: 'DUPLICATE_TEST', // Уже существует
        description: 'Duplicate code test'
      };

      await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(400);
    });
  });

  describe('GET /api/projects/:id', () => {
    let projectId: number;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({
          name: 'Project for Details',
          code: 'DETAILS',
          description: 'Project to test details endpoint'
        });

      projectId = response.body.id;
    });

    it('should return project by id', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(200);

      expect(response.body.id).toBe(projectId);
      expect(response.body.code).toBe('DETAILS');
    });
  });

  describe('PUT /api/projects/:id', () => {
    let projectId: number;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({
          name: 'Project to Update',
          code: 'UPDATE',
          description: 'Project for update test'
        });

      projectId = response.body.id;
    });

    it('should update project', async () => {
      const updateData = {
        description: 'Updated project description'
      };

      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.description).toBe(updateData.description);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    let projectId: number;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({
          name: 'Project to Delete',
          code: 'DELETE',
          description: 'Project for deletion test'
        });

      projectId = response.body.id;
    });

    it('should delete project', async () => {
      const response = await request(app)
        .delete(`/api/projects/${projectId}`)
        .expect(200);

      // Проверяем успешность операции
      expect(response.body).toHaveProperty('message');
    });
  });
});