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

import signalRoutes from '../src/routes/signalRoutes';

const uniqueSignalName = (prefix: string) =>
  `${prefix}_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 1000)}`;

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/signals', signalRoutes);
  return app;
};

describe('Signal API', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = createTestApp();
  });

  describe('GET /api/signals', () => {
    it('should return array of signals', async () => {
      const response = await request(app)
        .get('/api/signals')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return paginated response when limit/offset provided', async () => {
      await request(app)
        .post('/api/signals')
        .send({ name: uniqueSignalName('PAG_AI'), type: 'AI', description: 'paginated signal 1' })
        .expect(201);

      await request(app)
        .post('/api/signals')
        .send({ name: uniqueSignalName('PAG_DO'), type: 'DO', description: 'paginated signal 2' })
        .expect(201);

      const response = await request(app)
        .get('/api/signals?limit=1&offset=0')
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body.limit).toBe(1);
      expect(response.body.offset).toBe(0);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeLessThanOrEqual(1);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should support q and type filters without pagination (array response)', async () => {
      const targetName = uniqueSignalName('FILTER_SIG');

      await request(app)
        .post('/api/signals')
        .send({
          name: targetName,
          type: 'DI',
          description: 'searchable signal',
          category: 'Control'
        })
        .expect(201);

      const response = await request(app)
        .get(`/api/signals?q=${encodeURIComponent(targetName)}&type=DI`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.some((signal: any) => signal.name === targetName && signal.type === 'DI')).toBe(true);
    });
  });

  describe('POST /api/signals', () => {
    it('should create a new signal', async () => {
      const signalData = {
        name: 'Test AI Signal',
        type: 'AI',
        description: 'Analog input signal for testing',
        category: 'Measurement'
      };

      const response = await request(app)
        .post('/api/signals')
        .send(signalData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(signalData.name);
      expect(response.body.type).toBe(signalData.type);
    });
  });

  describe('PUT /api/signals/:id', () => {
    let signalId: number;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/signals')
        .send({
          name: 'Test DO Signal',
          type: 'DO',
          description: 'Digital output signal'
        });

      signalId = response.body.id;
    });

    it('should update signal', async () => {
      const updateData = {
        description: 'Updated digital output signal',
        category: 'Control'
      };

      const response = await request(app)
        .put(`/api/signals/${signalId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.description).toBe(updateData.description);
      expect(response.body.category).toBe(updateData.category);
    });
  });

  describe('DELETE /api/signals/:id', () => {
    let signalId: number;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/signals')
        .send({
          name: 'Test DI Signal',
          type: 'DI',
          description: 'Digital input signal'
        });

      signalId = response.body.id;
    });

    it('should delete signal', async () => {
      await request(app)
        .delete(`/api/signals/${signalId}`)
        .expect(200);
    });
  });
});
