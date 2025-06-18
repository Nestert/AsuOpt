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

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.NODE_ENV === 'test' 
    ? ':memory:' 
    : path.join(__dirname, '../../database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: false,
  },
});

// Функция для проверки существования колонки в таблице
const checkColumnExists = async (tableName: string, columnName: string): Promise<boolean> => {
  try {
    const [columns] = await sequelize.query(`PRAGMA table_info('${tableName}')`);
    return Array.isArray(columns) && (columns as any[]).some(col => col.name === columnName);
  } catch (error) {
    console.error(`Ошибка при проверке колонки ${columnName} в таблице ${tableName}:`, error);
    return false;
  }
};

// Функция для проверки существования таблицы
const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const [tables] = await sequelize.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
    return Array.isArray(tables) && tables.length > 0;
  } catch (error) {
    console.error(`Ошибка при проверке таблицы ${tableName}:`, error);
    return false;
  }
};

// Расширенная функция для обеспечения миграции проектов
const ensureProjectMigration = async () => {
  console.log('🔍 Проверка схемы базы данных...');

  try {
    // 1. Проверяем существование таблицы projects
    const projectsTableExists = await checkTableExists('projects');
    if (!projectsTableExists) {
      console.log('📝 Создание таблицы projects...');
      await sequelize.query(`
        CREATE TABLE projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          code VARCHAR(50) UNIQUE NOT NULL,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'template')),
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          settings TEXT
        )
      `);
      console.log('✅ Таблица projects создана');
    }

    // 2. Создаем дефолтный проект
    try {
      await sequelize.query(`
        INSERT OR IGNORE INTO projects (id, name, code, description, status) 
        VALUES (1, 'Основной проект', 'DEFAULT', 'Проект по умолчанию для существующих данных', 'active')
      `);
    } catch (error) {
      console.log('⚠️  Дефолтный проект уже существует');
    }

    // 3. Проверяем и добавляем project_id в device_references
    const deviceReferencesTableExists = await checkTableExists('device_references');
    if (deviceReferencesTableExists) {
      const hasProjectId = await checkColumnExists('device_references', 'project_id');
      if (!hasProjectId) {
        console.log('📝 Добавление project_id в device_references...');
        await sequelize.query(`ALTER TABLE device_references ADD COLUMN project_id INTEGER DEFAULT 1`);
        console.log('✅ Колонка project_id добавлена в device_references');
        
        // Обновляем существующие записи
        await sequelize.query(`UPDATE device_references SET project_id = 1 WHERE project_id IS NULL`);
        console.log('✅ Существующие записи обновлены');
      }
    }

    // 4. Проверяем и добавляем project_id в другие таблицы
    const tablesToUpdate = [
      { name: 'devices', column: 'project_id' },
      { name: 'kips', column: 'project_id' },
      { name: 'zras', column: 'project_id' },
      { name: 'signals', column: 'project_id' },
      { name: 'device_type_signals', column: 'project_id' },
      { name: 'device_signals', column: 'project_id' }
    ];

    for (const table of tablesToUpdate) {
      const tableExists = await checkTableExists(table.name);
      if (tableExists) {
        const hasColumn = await checkColumnExists(table.name, table.column);
        if (!hasColumn) {
          console.log(`📝 Добавление ${table.column} в ${table.name}...`);
          try {
            await sequelize.query(`ALTER TABLE ${table.name} ADD COLUMN ${table.column} INTEGER DEFAULT 1`);
            console.log(`✅ Колонка ${table.column} добавлена в ${table.name}`);
            
            // Обновляем существующие записи
            await sequelize.query(`UPDATE ${table.name} SET ${table.column} = 1 WHERE ${table.column} IS NULL`);
          } catch (error: any) {
            if (!error.message.includes('duplicate column name')) {
              console.error(`❌ Ошибка при добавлении колонки в ${table.name}:`, error.message);
            }
          }
        }
      }
    }

    // 5. Создаем индексы
    console.log('📝 Создание индексов...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_device_references_project_id ON device_references(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_devices_project_id ON devices(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_kips_project_id ON kips(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_zras_project_id ON zras(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_signals_project_id ON signals(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_device_type_signals_project_id ON device_type_signals(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_device_signals_project_id ON device_signals(project_id)'
    ];

    for (const indexQuery of indexes) {
      try {
        await sequelize.query(indexQuery);
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          console.error('Ошибка при создании индекса:', error.message);
        }
      }
    }

    // 6. Создаем уникальный индекс для device_references
    try {
      await sequelize.query('DROP INDEX IF EXISTS sqlite_autoindex_device_references_1');
      await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_device_references_proj_pos ON device_references(project_id, posDesignation)');
    } catch (error: any) {
      console.log('⚠️  Ошибка при создании уникального индекса:', error.message);
    }

    // 7. Создаем триггеры
    try {
      await sequelize.query(`
        CREATE TRIGGER IF NOT EXISTS update_projects_updated_at 
        AFTER UPDATE ON projects
        FOR EACH ROW
        BEGIN
          UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `);
    } catch (error: any) {
      console.log('⚠️  Ошибка при создании триггера:', error.message);
    }

    console.log('✅ Проверка и обновление схемы базы данных завершены');

  } catch (error) {
    console.error('❌ Критическая ошибка при обновлении схемы базы данных:', error);
    throw error;
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
    console.log('🚀 Инициализация базы данных...');
    
    // Проверяем подключение
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено');

    // Выполняем миграцию проектов
    await ensureProjectMigration();

    console.log('✅ База данных инициализирована');
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error);
    throw error;
  }
};

export { sequelize, initializeDatabase, ensureProjectMigration }; 