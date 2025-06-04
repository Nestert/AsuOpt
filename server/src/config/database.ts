import { Sequelize } from 'sequelize';
import path from 'path';
import fs from 'fs';
import { Device } from '../models/Device';
import { DeviceReference } from '../models/DeviceReference';
import { Kip } from '../models/Kip';
import { Zra } from '../models/Zra';
import { Signal } from '../models/Signal';
import { DeviceSignal } from '../models/DeviceSignal';
import { DeviceTypeSignal } from '../models/DeviceTypeSignal';
import { Project } from '../models/Project';

const dbPath = path.join(__dirname, '../../database.sqlite');

// Настройка SQLite (для локальной разработки)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
});

// Проверка наличия project_id и запуск миграции при необходимости
const ensureProjectMigration = async () => {
  const [columns] = await sequelize.query("PRAGMA table_info('device_references')");
  const hasProjectId = Array.isArray(columns) && (columns as any[]).some(col => col.name === 'project_id');

  if (!hasProjectId) {
    console.log('project_id column not found, running migration...');

    const candidates = [
      path.join(__dirname, '../migrations/001_add_projects.sql'),
      path.join(__dirname, '../../src/migrations/001_add_projects.sql'),
      path.join(__dirname, '../../migrations/001_add_projects.sql')
    ];

    let migrationSQL = '';
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        migrationSQL = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (migrationSQL) {
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      for (const command of commands) {
        try {
          await sequelize.query(command);
        } catch (err: any) {
          if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
            console.error('Migration error:', err);
          }
        }
      }

      console.log('Migration finished');
    } else {
      console.error('Migration file not found, unable to run migration');
    }
  }
};

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
    Project.initialize(sequelize);
    Device.initialize(sequelize);
    DeviceReference.initialize(sequelize);
    Kip.initialize(sequelize);
    Zra.initialize(sequelize);
    Signal.initialize(sequelize);
    DeviceSignal.initialize(sequelize);
    DeviceTypeSignal.initialize(sequelize);
    
    // Устанавливаем ассоциации между моделями
    Project.associate({});
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

    await ensureProjectMigration();
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
    throw error;
  }
};

export { sequelize, initializeDatabase }; 