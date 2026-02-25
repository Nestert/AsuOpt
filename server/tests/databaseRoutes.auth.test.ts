import express from 'express';
import request from 'supertest';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler';

const mockClearTable = jest.fn(async (req, res) => {
  res.status(200).json({ success: true, tableName: req.params.tableName });
});

const mockGetAllTables = jest.fn(async (req, res) => {
  res.status(200).json({ success: true, tables: [] });
});

jest.mock('../src/controllers/databaseController', () => ({
  DatabaseController: {
    clearTable: (req, res) => mockClearTable(req, res),
    getAllTables: (req, res) => mockGetAllTables(req, res),
  },
}));

jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: () => void) => {
    const token = req.headers.authorization;
    if (!token) {
      res.status(401).json({ message: 'Требуется авторизация' });
      return;
    }

    if (token === 'Bearer admin') {
      req.user = { role: 'admin' };
      next();
      return;
    }

    if (token === 'Bearer user') {
      req.user = { role: 'user' };
      next();
      return;
    }

    res.status(401).json({ message: 'Неверный токен авторизации' });
  },
  requireAdmin: (req: any, res: any, next: () => void) => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Требуются права администратора' });
      return;
    }
    next();
  },
}));

import databaseRoutes from '../src/routes/databaseRoutes';

describe('databaseRoutes auth protection', () => {
  beforeEach(() => {
    mockClearTable.mockClear();
    mockGetAllTables.mockClear();
  });

  const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/database', databaseRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
  };

  it('returns 401 without token', async () => {
    const response = await request(createApp()).delete('/api/database/tables/devices');

    expect(response.status).toBe(401);
    expect(mockClearTable).not.toHaveBeenCalled();
  });

  it('returns 403 for non-admin token', async () => {
    const response = await request(createApp())
      .delete('/api/database/tables/devices')
      .set('Authorization', 'Bearer user');

    expect(response.status).toBe(403);
    expect(mockClearTable).not.toHaveBeenCalled();
  });

  it('allows admin token', async () => {
    const response = await request(createApp())
      .delete('/api/database/tables/devices')
      .set('Authorization', 'Bearer admin');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, tableName: 'devices' });
    expect(mockClearTable).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid tableName with error envelope', async () => {
    const response = await request(createApp())
      .delete('/api/database/tables/not_allowed_table')
      .set('Authorization', 'Bearer admin');

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockClearTable).not.toHaveBeenCalled();
  });
});
