import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { initializeDatabase } from './config/database';
import deviceRoutes from './routes/deviceRoutes';
import exportRoutes from './routes/exportRoutes';
import importRoutes from './routes/importRoutes';
import deviceReferenceRoutes from './routes/deviceReferenceRoutes';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Статический доступ к директории uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
app.use('/api/devices', deviceRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/device-references', deviceReferenceRoutes);

// Обработка ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
}); 