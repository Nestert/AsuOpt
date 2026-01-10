import request from 'supertest';
import express from 'express';
import { sequelize } from '../src/config/database';
import { initializeModels } from '../src/config/initializeModels';
import deviceRoutes from '../src/routes/deviceRoutes';
import projectRoutes from '../src/routes/projectRoutes';

// Создаем тестовое приложение
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Подключаем маршруты
  app.use('/api/devices', deviceRoutes);
  app.use('/api/projects', projectRoutes);

  return app;
};

describe('Device API', () => {
  let app: express.Application;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.authenticate();
    await initializeModels();
    app = createTestApp();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/devices', () => {
    it('should return empty array when no devices exist', async () => {
      const response = await request(app)
        .get('/api/devices')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('POST /api/devices', () => {
    it('should create a new device', async () => {
      const deviceData = {
        systemCode: 'SYS001',
        equipmentCode: 'EQ001',
        lineNumber: 'L001',
        cabinetName: 'CAB001',
        deviceDesignation: 'TEST-001',
        deviceType: 'PLC',
        description: 'Test device',
        projectId: 1
      };

      const response = await request(app)
        .post('/api/devices')
        .send(deviceData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.deviceDesignation).toBe(deviceData.deviceDesignation);
      expect(response.body.deviceType).toBe(deviceData.deviceType);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/devices')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/devices/:id', () => {
    let deviceId: number;

    beforeAll(async () => {
      // Создаем тестовое устройство
      const response = await request(app)
        .post('/api/devices')
        .send({
          systemCode: 'SYS002',
          equipmentCode: 'EQ002',
          lineNumber: 'L002',
          cabinetName: 'CAB002',
          deviceDesignation: 'TEST-002',
          deviceType: 'Sensor',
          description: 'Test sensor',
          projectId: 1
        });

      deviceId = response.body.id;
    });

    it('should return device by id', async () => {
      const response = await request(app)
        .get(`/api/devices/${deviceId}`)
        .expect(200);

      expect(response.body.id).toBe(deviceId);
      expect(response.body.deviceDesignation).toBe('TEST-002');
    });

    it('should return 404 for non-existent device', async () => {
      await request(app)
        .get('/api/devices/99999')
        .expect(404);
    });
  });

  describe('PUT /api/devices/:id', () => {
    let deviceId: number;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/devices')
        .send({
          systemCode: 'SYS003',
          equipmentCode: 'EQ003',
          lineNumber: 'L003',
          cabinetName: 'CAB003',
          deviceDesignation: 'TEST-003',
          deviceType: 'Valve',
          description: 'Test valve',
          projectId: 1
        });

      deviceId = response.body.id;
    });

    it('should update device', async () => {
      const updateData = {
        description: 'Updated test valve',
        systemCode: 'SYS002'
      };

      const response = await request(app)
        .put(`/api/devices/${deviceId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.description).toBe(updateData.description);
      expect(response.body.systemCode).toBe(updateData.systemCode);
    });
  });

  describe('DELETE /api/devices/:id', () => {
    let deviceId: number;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/devices')
        .send({
          systemCode: 'SYS004',
          equipmentCode: 'EQ004',
          lineNumber: 'L004',
          cabinetName: 'CAB004',
          deviceDesignation: 'TEST-004',
          deviceType: 'Motor',
          description: 'Test motor',
          projectId: 1
        });

      deviceId = response.body.id;
    });

    it('should delete device', async () => {
      await request(app)
        .delete(`/api/devices/${deviceId}`)
        .expect(200);

      // Проверяем, что устройство удалено
      await request(app)
        .get(`/api/devices/${deviceId}`)
        .expect(404);
    });
  });
});