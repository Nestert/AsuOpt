import { Sequelize } from 'sequelize';
import path from 'path';
import { Device } from '../models/Device';

const dbPath = path.join(__dirname, '../../database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
});

// Инициализация моделей
const initializeDatabase = async () => {
  try {
    Device.initialize(sequelize);
    
    // Устанавливаем ассоциации между моделями
    Device.associate();

    // Синхронизируем модели с базой данных
    // Отключаем alter: true, чтобы избежать проблем с SQLite при изменении схемы
    await sequelize.sync({ alter: false });
    console.log('База данных успешно инициализирована');
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
    throw error;
  }
};

export { sequelize, initializeDatabase }; 