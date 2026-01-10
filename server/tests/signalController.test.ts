import request from 'supertest';
import express from 'express';
import signalRoutes from '../src/routes/signalRoutes';

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