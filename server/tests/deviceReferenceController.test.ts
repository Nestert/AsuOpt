import request from 'supertest';
import express from 'express';
import { sequelize } from '../src/config/database';
import { initializeModels } from '../src/config/initializeModels';
import deviceReferenceRoutes from '../src/routes/deviceReferenceRoutes';
import projectRoutes from '../src/routes/projectRoutes';

// Создаем тестовое приложение
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Подключаем маршруты
  app.use('/api/device-references', deviceReferenceRoutes);
  app.use('/api/projects', projectRoutes);

  return app;
};

describe('Device Reference API', () => {
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

  describe('GET /api/device-references', () => {
    it('should return array of device references', async () => {
      const response = await request(app)
        .get('/api/device-references')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/device-references', () => {
    it('should create a new device reference', async () => {
      const deviceData = {
        reference: {
          posDesignation: 'TEST-001',
          deviceType: 'PLC',
          description: 'Test device',
          systemCode: 'SYS001',
          plcType: 'Siemens',
          exVersion: '1',
          projectId: 1
        },
        dataType: 'kip',
        kip: {
          section: 'Технологический',
          unitArea: 'Цех №1',
          manufacturer: 'Siemens',
          measureUnit: '°C',
          responsibilityZone: 'Технолог',
          connectionScheme: '4-проводная',
          power: '24V',
          environmentCharacteristics: 'Взрывоопасная',
          signalPurpose: 'Контроль температуры'
        }
      };

      const response = await request(app)
        .post('/api/device-references')
        .send(deviceData)
        .expect(201);

      expect(response.body.reference).toHaveProperty('id');
      expect(response.body.reference.posDesignation).toBe(deviceData.reference.posDesignation);
      expect(response.body.reference.deviceType).toBe(deviceData.reference.deviceType);
      expect(response.body.kip).toBeDefined();
    });

    it('should create a ZRA device reference', async () => {
      const deviceData = {
        reference: {
          posDesignation: 'TEST-ZRA-001',
          deviceType: 'Valve',
          description: 'Test valve device',
          systemCode: 'SYS002',
          plcType: 'Schneider',
          exVersion: '2',
          projectId: 1
        },
        dataType: 'zra',
        zra: {
          unitArea: 'Цех №2',
          designType: 'Шаровой кран',
          valveType: 'Запорный',
          actuatorType: 'Электрический',
          pipePosition: 'Горизонтальная',
          nominalDiameter: 'DN50',
          pressureRating: 'PN16',
          pipeMaterial: 'Сталь',
          medium: 'Вода',
          positionSensor: 'Есть',
          solenoidType: 'Нормально-закрытый',
          emergencyPosition: 'Закрыто'
        }
      };

      const response = await request(app)
        .post('/api/device-references')
        .send(deviceData)
        .expect(201);

      expect(response.body.reference).toHaveProperty('id');
      expect(response.body.reference.posDesignation).toBe(deviceData.reference.posDesignation);
      expect(response.body.zra).toBeDefined();
    });
  });

  describe('GET /api/device-references/:id', () => {
    it('should return device reference by id', async () => {
      // Создаем тестовое устройство
      const createResponse = await request(app)
        .post('/api/device-references')
        .send({
          reference: {
            posDesignation: 'TEST-002',
            deviceType: 'Sensor',
            description: 'Test sensor',
            systemCode: 'SYS002',
            projectId: 1
          },
          dataType: 'kip',
          kip: { section: 'Технологический', manufacturer: 'TestManufacturer' }
        });

      const deviceId = createResponse.body.reference.id;

      const response = await request(app)
        .get(`/api/device-references/${deviceId}`)
        .expect(200);

      expect(response.body.reference.id).toBe(deviceId);
      expect(response.body.reference.posDesignation).toBe('TEST-002');
      expect(response.body.kip).toBeDefined();
    });

    it('should return 404 for non-existent device', async () => {
      await request(app)
        .get('/api/device-references/99999')
        .expect(404);
    });
  });

  describe('PUT /api/device-references/:id', () => {
    it('should update device reference', async () => {
      // Создаем тестовое устройство
      const createResponse = await request(app)
        .post('/api/device-references')
        .send({
          reference: {
            posDesignation: 'TEST-003',
            deviceType: 'Valve',
            description: 'Test valve',
            systemCode: 'SYS003',
            projectId: 1
          },
          dataType: 'zra',
          zra: { designType: 'Шаровой кран', nominalDiameter: 'DN50' }
        })
        .expect(201);

      expect(createResponse.body).toHaveProperty('reference');
      expect(createResponse.body.reference).toHaveProperty('id');

      const deviceId = createResponse.body.reference.id;
      const updateData = {
        description: 'Updated test valve'
      };

      const response = await request(app)
        .put(`/api/device-references/${deviceId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Данные устройства успешно обновлены');
      expect(response.body.device.description).toBe(updateData.description);
    });
  });

  describe('DELETE /api/device-references/:id', () => {
    it('should delete device reference', async () => {
      // Создаем тестовое устройство
      const createResponse = await request(app)
        .post('/api/device-references')
        .send({
          reference: {
            posDesignation: 'TEST-004',
            deviceType: 'Motor',
            description: 'Test motor',
            systemCode: 'SYS004',
            projectId: 1
          },
          dataType: null
        })
        .expect(201);

      expect(createResponse.body).toHaveProperty('reference');
      expect(createResponse.body.reference).toHaveProperty('id');

      const deviceId = createResponse.body.reference.id;

      await request(app)
        .delete(`/api/device-references/${deviceId}`)
        .expect(200);

      // Проверяем, что устройство удалено
      await request(app)
        .get(`/api/device-references/${deviceId}`)
        .expect(404);
    });
  });
});