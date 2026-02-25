import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeDatabase } from './config/database';
import { initializeModels } from './config/initializeModels';
import { swaggerUi, specs } from './config/swagger';
import deviceRoutes from './routes/deviceRoutes';
import exportRoutes from './routes/exportRoutes';
import importRoutes from './routes/importRoutes';
import deviceReferenceRoutes from './routes/deviceReferenceRoutes';
import kipRoutes from './routes/kipRoutes';
import zraRoutes from './routes/zraRoutes';
import signalRoutes from './routes/signalRoutes';
import deviceTypeSignalRoutes from './routes/deviceTypeSignalRoutes';
import databaseRoutes from './routes/databaseRoutes';
import projectRoutes from './routes/projectRoutes';
import authRoutes from './routes/authRoutes';
import path from 'path';
import { PORT, isTest, assertRequiredEnv } from './config/env';
import { attachRequestContext, requestLogger } from './middleware/requestContext';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
assertRequiredEnv();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

// Middlewares
app.use(attachRequestContext);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'], // Разрешенные источники
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Разрешенные методы
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

// Статический доступ к директории uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger документация
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Логирование запросов
app.use(requestLogger);

// Инициализация базы данных и моделей
const initialize = async () => {
  try {
    console.log('🚀 Инициализация базы данных...');
    await initializeDatabase();
    console.log('✅ База данных инициализирована');

    console.log('🔧 Инициализация моделей...');
    await initializeModels();
    console.log('✅ Модели инициализированы');

    console.log('🎉 Система полностью инициализирована');
  } catch (error) {
    console.error('❌ Критическая ошибка при инициализации:', error);
    process.exit(1);
  }
};

initialize();

// Маршруты

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/device-references', deviceReferenceRoutes);
app.use('/api/kip', kipRoutes);
app.use('/api/zra', zraRoutes);
app.use('/api/device-type-signals', deviceTypeSignalRoutes);
app.use('/api/database', databaseRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
}); 
