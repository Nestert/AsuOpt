import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { initializeDatabase } from './config/database';
import deviceRoutes from './routes/deviceRoutes';
import exportRoutes from './routes/exportRoutes';
import importRoutes from './routes/importRoutes';
import deviceReferenceRoutes from './routes/deviceReferenceRoutes';
import signalTypeRoutes from './routes/signalTypeRoutes';
import kipRoutes from './routes/kipRoutes';
import zraRoutes from './routes/zraRoutes';
import signalRoutes from './routes/signalRoutes';
import deviceTypeSignalRoutes from './routes/deviceTypeSignalRoutes';
import databaseRoutes from './routes/databaseRoutes';
import projectRoutes from './routes/projectRoutes';
import path from 'path';
import * as signalController from './controllers/signalController';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Разрешенные источники
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Разрешенные методы
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Статический доступ к директории uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Логирование запросов
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Инициализация базы данных
initializeDatabase()
  .then(() => {
    console.log('База данных инициализирована успешно');
  })
  .catch((error) => {
    console.error('Ошибка при инициализации базы данных:', error);
    process.exit(1);
  });

// Маршруты

// --- Маршрут для очистки сигналов (определен здесь из-за проблем с signalRoutes) ---
app.delete('/api/signals/clear', (req, res, next) => {
  signalController.clearAllSignals(req, res).catch(next);
});
// --------------------------------------------------------------------------------

app.use('/api/projects', projectRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/device-references', deviceReferenceRoutes);
app.use('/api/kip', kipRoutes);
app.use('/api/zra', zraRoutes);
app.use('/api/device-type-signals', deviceTypeSignalRoutes);
app.use('/api/signal-types', signalTypeRoutes);
app.use('/api/database', databaseRoutes);

// Обработка ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Ошибка сервера:');
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Внутренняя ошибка сервера';
  
  // Детали ошибки (только для разработки)
  const details = process.env.NODE_ENV !== 'production' ? err.stack : undefined;
  
  res.status(statusCode).json({ 
    message,
    details,
    timestamp: new Date().toISOString()
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
}); 