import express from 'express';
import request from 'supertest';

jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: () => void) => {
    const token = req.headers.authorization;
    if (token !== 'Bearer admin') {
      res.status(401).json({ message: 'Требуется авторизация' });
      return;
    }
    req.user = { id: 1, role: 'admin' };
    next();
  },
  requireAdmin: (req: any, res: any, next: () => void) => next(),
}));

import databaseRoutes from '../src/routes/databaseRoutes';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler';
import { Project } from '../src/models/Project';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/database', databaseRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

describe('DatabaseController clearTable integration', () => {
  it('clears allowlisted projects table via ORM branch', async () => {
    await Project.create({
      name: 'To be deleted',
      code: `DBCLR_${Date.now()}`,
      status: 'active',
    });

    const response = await request(createApp())
      .delete('/api/database/tables/projects')
      .set('Authorization', 'Bearer admin');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.deletedCount).toBeGreaterThanOrEqual(1);

    const remaining = await Project.count();
    expect(remaining).toBe(0);
  });

  it('safely handles allowlisted raw table when it does not exist', async () => {
    const response = await request(createApp())
      .delete('/api/database/tables/device_type_signals')
      .set('Authorization', 'Bearer admin');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.deletedCount).toBe(0);
  });
});

