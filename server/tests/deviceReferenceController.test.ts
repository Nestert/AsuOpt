import request from 'supertest';
import express from 'express';
import { sequelize } from '../src/config/database';
import { initializeModels } from '../src/config/initializeModels';

jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: () => void) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  requireAdmin: (req: any, res: any, next: () => void) => next(),
  requireUser: (req: any, res: any, next: () => void) => next(),
}));

import deviceReferenceRoutes from '../src/routes/deviceReferenceRoutes';
import projectRoutes from '../src/routes/projectRoutes';

const uniquePos = (prefix: string) =>
  `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

const countTreeLeaves = (nodes: any[]): number =>
  nodes.reduce((acc, node) => {
    if (node?.isLeaf) {
      return acc + 1;
    }
    if (Array.isArray(node?.children)) {
      return acc + countTreeLeaves(node.children);
    }
    return acc;
  }, 0);

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

    it('should return paginated response when limit/offset provided', async () => {
      await request(app)
        .post('/api/device-references')
        .send({
          reference: {
            posDesignation: uniquePos('PAG-001'),
            deviceType: 'Sensor',
            description: 'Paginated device 1',
            systemCode: 'SYS-PAG',
            projectId: 1
          },
          dataType: null
        })
        .expect(201);

      await request(app)
        .post('/api/device-references')
        .send({
          reference: {
            posDesignation: uniquePos('PAG-002'),
            deviceType: 'Valve',
            description: 'Paginated device 2',
            systemCode: 'SYS-PAG',
            projectId: 1
          },
          dataType: null
        })
        .expect(201);

      const response = await request(app)
        .get('/api/device-references?limit=1&offset=0')
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body.limit).toBe(1);
      expect(response.body.offset).toBe(0);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeLessThanOrEqual(1);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should support q filter and keep array response without pagination', async () => {
      const targetPos = uniquePos('FINDME');

      await request(app)
        .post('/api/device-references')
        .send({
          reference: {
            posDesignation: targetPos,
            deviceType: 'Motor',
            description: 'Search target device',
            systemCode: 'SYS-SEARCH',
            projectId: 1
          },
          dataType: null
        })
        .expect(201);

      const response = await request(app)
        .get(`/api/device-references?q=${encodeURIComponent(targetPos)}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.some((device: any) => device.posDesignation === targetPos)).toBe(true);
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

  describe('GET /api/device-references/tree', () => {
    it('should support q filter and return matching tree nodes', async () => {
      const targetPos = uniquePos('TREEFIND');

      await request(app)
        .post('/api/device-references')
        .send({
          reference: {
            posDesignation: targetPos,
            deviceType: 'Sensor',
            description: 'Tree search device',
            systemCode: 'SYS-TREE',
            projectId: 1
          },
          dataType: null
        })
        .expect(201);

      const response = await request(app)
        .get(`/api/device-references/tree?q=${encodeURIComponent(targetPos)}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(countTreeLeaves(response.body)).toBe(1);
    });

    it('should apply maxNodes limit before building tree', async () => {
      await request(app)
        .post('/api/device-references')
        .send({
          reference: {
            posDesignation: uniquePos('TREELIM-001'),
            deviceType: 'Valve',
            description: 'Tree limited device 1',
            systemCode: 'SYS-LIM',
            projectId: 1
          },
          dataType: null
        })
        .expect(201);

      await request(app)
        .post('/api/device-references')
        .send({
          reference: {
            posDesignation: uniquePos('TREELIM-002'),
            deviceType: 'Valve',
            description: 'Tree limited device 2',
            systemCode: 'SYS-LIM',
            projectId: 1
          },
          dataType: null
        })
        .expect(201);

      const response = await request(app)
        .get('/api/device-references/tree?maxNodes=1')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(countTreeLeaves(response.body)).toBe(1);
      expect(response.headers['x-items-limited']).toBe('true');
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
