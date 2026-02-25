import express from 'express';
import request from 'supertest';

const mockSearchDevices = jest.fn(async (req, res) => {
  res.status(200).json({ route: 'search', query: req.query.query ?? null });
});

const mockGetDeviceById = jest.fn(async (req, res) => {
  res.status(200).json({ route: 'by-id', id: req.params.id });
});

jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: unknown, res: unknown, next: () => void) => next(),
  requireAdmin: (req: unknown, res: unknown, next: () => void) => next(),
}));

jest.mock('../src/controllers/deviceController', () => ({
  getDeviceTree: jest.fn(async (req, res) => res.status(200).json([])),
  getAllDevices: jest.fn(async (req, res) => res.status(200).json([])),
  clearAllDevices: jest.fn(async (req, res) => res.status(200).json({ ok: true })),
  getDeviceById: (req, res) => mockGetDeviceById(req, res),
  createDevice: jest.fn(async (req, res) => res.status(201).json({ ok: true })),
  updateDevice: jest.fn(async (req, res) => res.status(200).json({ ok: true })),
  deleteDevice: jest.fn(async (req, res) => res.status(200).json({ ok: true })),
  getDeviceChildren: jest.fn(async (req, res) => res.status(200).json([])),
  searchDevices: (req, res) => mockSearchDevices(req, res),
}));

import deviceRoutes from '../src/routes/deviceRoutes';

describe('deviceRoutes route matching', () => {
  beforeEach(() => {
    mockSearchDevices.mockClear();
    mockGetDeviceById.mockClear();
  });

  it('routes /search to searchDevices instead of getDeviceById', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/devices', deviceRoutes);

    const response = await request(app).get('/api/devices/search?query=abc');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'search', query: 'abc' });
    expect(mockSearchDevices).toHaveBeenCalledTimes(1);
    expect(mockGetDeviceById).not.toHaveBeenCalled();
  });
});
