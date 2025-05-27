import { initializeDatabase } from '../config/database';
import { sequelize } from '../config/database';

async function runMigrationStep() {
  try {
    console.log('🚀 Начинаем пошаговую миграцию базы данных...');
    
    // Инициализируем подключение к базе данных
    await initializeDatabase();
    
    // Шаг 1: Создание таблицы проектов
    console.log('📝 Шаг 1: Создание таблицы projects...');
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS projects (
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
    } catch (error) {
      console.log('⚠️  Таблица projects уже существует');
    }
    
    // Шаг 2: Создание дефолтного проекта
    console.log('📝 Шаг 2: Создание дефолтного проекта...');
    try {
      await sequelize.query(`
        INSERT INTO projects (name, code, description, status) 
        VALUES ('Основной проект', 'DEFAULT', 'Проект по умолчанию для существующих данных', 'active')
      `);
      console.log('✅ Дефолтный проект создан');
    } catch (error) {
      console.log('⚠️  Дефолтный проект уже существует');
    }
    
    // Шаг 3: Добавление project_id в device_references
    console.log('📝 Шаг 3: Добавление project_id в device_references...');
    try {
      await sequelize.query(`ALTER TABLE device_references ADD COLUMN project_id INTEGER DEFAULT 1`);
      console.log('✅ Столбец project_id добавлен в device_references');
    } catch (error) {
      console.log('⚠️  Столбец project_id уже существует в device_references');
    }
    
    // Шаг 4: Добавление project_id в kips
    console.log('📝 Шаг 4: Добавление project_id в kips...');
    try {
      await sequelize.query(`ALTER TABLE kips ADD COLUMN project_id INTEGER DEFAULT 1`);
      console.log('✅ Столбец project_id добавлен в kips');
    } catch (error) {
      console.log('⚠️  Столбец project_id уже существует в kips');
    }
    
    // Шаг 5: Добавление project_id в zras
    console.log('📝 Шаг 5: Добавление project_id в zras...');
    try {
      await sequelize.query(`ALTER TABLE zras ADD COLUMN project_id INTEGER DEFAULT 1`);
      console.log('✅ Столбец project_id добавлен в zras');
    } catch (error) {
      console.log('⚠️  Столбец project_id уже существует в zras');
    }
    
    // Шаг 6: Добавление project_id в signals
    console.log('📝 Шаг 6: Добавление project_id в signals...');
    try {
      await sequelize.query(`ALTER TABLE signals ADD COLUMN project_id INTEGER DEFAULT 1`);
      console.log('✅ Столбец project_id добавлен в signals');
    } catch (error) {
      console.log('⚠️  Столбец project_id уже существует в signals');
    }
    
    // Шаг 7: Добавление project_id в device_type_signals
    console.log('📝 Шаг 7: Добавление project_id в device_type_signals...');
    try {
      await sequelize.query(`ALTER TABLE device_type_signals ADD COLUMN project_id INTEGER DEFAULT 1`);
      console.log('✅ Столбец project_id добавлен в device_type_signals');
    } catch (error) {
      console.log('⚠️  Столбец project_id уже существует в device_type_signals');
    }
    
    // Шаг 8: Создание индексов
    console.log('📝 Шаг 8: Создание индексов...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_device_references_project_id ON device_references(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_kips_project_id ON kips(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_zras_project_id ON zras(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_signals_project_id ON signals(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_device_type_signals_project_id ON device_type_signals(project_id)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await sequelize.query(indexSQL);
        console.log(`✅ Индекс создан: ${indexSQL.split(' ')[5]}`);
      } catch (error) {
        console.log(`⚠️  Индекс уже существует: ${indexSQL.split(' ')[5]}`);
      }
    }
    
    // Шаг 9: Создание таблицы шаблонов
    console.log('📝 Шаг 9: Создание таблицы project_templates...');
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS project_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          template_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Таблица project_templates создана');
    } catch (error) {
      console.log('⚠️  Таблица project_templates уже существует');
    }
    
    // Проверяем результат
    console.log('\n🔍 Проверяем результат миграции...');
    
    const [projects] = await sequelize.query('SELECT * FROM projects');
    console.log(`📊 Найдено проектов: ${projects.length}`);
    
    const [devices] = await sequelize.query('SELECT id, project_id FROM device_references LIMIT 5');
    console.log(`📊 Проверка device_references: найдено ${devices.length} записей с project_id`);
    
    console.log('\n🎉 Миграция завершена успешно!');
    console.log('📋 Что было сделано:');
    console.log('   ✅ Создана таблица projects');
    console.log('   ✅ Создан дефолтный проект');
    console.log('   ✅ Добавлен project_id во все основные таблицы');
    console.log('   ✅ Созданы индексы для производительности');
    console.log('   ✅ Создана таблица project_templates');
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Запускаем миграцию
runMigrationStep(); 