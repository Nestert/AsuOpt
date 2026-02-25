import request from 'supertest';
import express from 'express';

jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: () => void) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  requireAdmin: (req: any, res: any, next: () => void) => next(),
  requireUser: (req: any, res: any, next: () => void) => next(),
}));

import projectRoutes from '../src/routes/projectRoutes';

const uniqueCode = (prefix: string) => `${prefix}${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;

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

    it('should return paginated response when limit/offset provided', async () => {
      const createOne = (name: string, code: string) =>
        request(app).post('/api/projects').send({ name, code, description: `${name} desc` });

      await createOne('Paginated A', uniqueCode('PGA'));
      await createOne('Paginated B', uniqueCode('PGB'));

      const response = await request(app)
        .get('/api/projects?limit=1&offset=0')
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body.limit).toBe(1);
      expect(response.body.offset).toBe(0);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeLessThanOrEqual(1);
      expect(response.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should support q filter and keep array response without pagination', async () => {
      const uniqueName = `Filter Project ${Date.now()}`;
      const uniqueSearchCode = uniqueCode('QRY');

      await request(app)
        .post('/api/projects')
        .send({
          name: uniqueName,
          code: uniqueSearchCode,
          description: 'Project for q filter test'
        })
        .expect(201);

      const response = await request(app)
        .get(`/api/projects?q=${encodeURIComponent(uniqueSearchCode)}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.some((project: any) => project.code === uniqueSearchCode)).toBe(true);
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
    let detailsCode: string;

    beforeAll(async () => {
      detailsCode = uniqueCode('DET');
      const response = await request(app)
        .post('/api/projects')
        .send({
          name: 'Project for Details',
          code: detailsCode,
          description: 'Project to test details endpoint'
        });

      expect(response.status).toBe(201);
      projectId = response.body.id;
    });

    it('should return project by id', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(200);

      expect(response.body.id).toBe(projectId);
      expect(response.body.code).toBe(detailsCode);
    });
  });

  describe('PUT /api/projects/:id', () => {
    let projectId: number;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({
          name: 'Project to Update',
          code: uniqueCode('UPD'),
          description: 'Project for update test'
        });

      expect(response.status).toBe(201);
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
          code: uniqueCode('DEL'),
          description: 'Project for deletion test'
        });

      expect(response.status).toBe(201);
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
