import { Sequelize } from 'sequelize';
import path from 'path';
import { Device } from '../models/Device';
import { DeviceReference } from '../models/DeviceReference';
import { Kip } from '../models/Kip';
import { Zra } from '../models/Zra';
import { Signal } from '../models/Signal';
import { DeviceSignal } from '../models/DeviceSignal';
import { DeviceTypeSignal } from '../models/DeviceTypeSignal';

const dbPath = path.join(__dirname, '../../database.sqlite');

// Настройка SQLite (для локальной разработки)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
});

// Примечание: для PostgreSQL (для сетевой версии)
// const sequelize = new Sequelize({
//   dialect: 'postgres',
//   host: process.env.DB_HOST || 'localhost',
//   port: parseInt(process.env.DB_PORT || '5432'),
//   username: process.env.DB_USER || 'postgres',
//   password: process.env.DB_PASSWORD || 'postgres',
//   database: process.env.DB_NAME || 'asuopt',
//   logging: false,
// });

// Инициализация моделей
const initializeDatabase = async () => {
  try {
    // Инициализация всех моделей
    Device.initialize(sequelize);
    DeviceReference.initialize(sequelize);
    Kip.initialize(sequelize);
    Zra.initialize(sequelize);
    Signal.initialize(sequelize);
    DeviceSignal.initialize(sequelize);
    DeviceTypeSignal.initialize(sequelize);
    
    // Устанавливаем ассоциации между моделями
    Device.associate();
    DeviceReference.associate();
    Kip.associate();
    Zra.associate();
    Signal.associate();
    DeviceSignal.associate();

    // Синхронизируем модели с базой данных
    // SQLite не поддерживает полноценно alter: true, используем force: false
    await sequelize.sync({ force: false });
    
    console.log('База данных успешно инициализирована');
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
    throw error;
  }
};

export { sequelize, initializeDatabase }; 