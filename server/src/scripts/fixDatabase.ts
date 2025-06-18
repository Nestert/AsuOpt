import { sequelize, ensureProjectMigration } from '../config/database';

async function fixDatabase() {
  console.log('🛠️  Запуск исправления базы данных...');

  try {
    // Выполняем основную миграцию проектов
    await ensureProjectMigration();

    // Дополнительно проверяем и исправляем таблицу devices
    console.log('🔍 Проверка таблицы devices...');
    
    // Проверяем существование колонки project_id в devices
    const [devicesColumns] = await sequelize.query(`PRAGMA table_info('devices')`);
    const hasProjectIdInDevices = Array.isArray(devicesColumns) && 
      (devicesColumns as any[]).some(col => col.name === 'project_id');

    if (!hasProjectIdInDevices) {
      console.log('📝 Добавление project_id в таблицу devices...');
      await sequelize.query(`ALTER TABLE devices ADD COLUMN project_id INTEGER DEFAULT 1`);
      console.log('✅ Колонка project_id добавлена в devices');
      
      // Обновляем существующие записи
      await sequelize.query(`UPDATE devices SET project_id = 1 WHERE project_id IS NULL`);
      console.log('✅ Существующие записи в devices обновлены');
      
      // Создаем индекс
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_devices_project_id ON devices(project_id)');
      console.log('✅ Индекс для devices.project_id создан');
    } else {
      console.log('✅ Колонка project_id в devices уже существует');
    }

    // Проверяем другие важные таблицы
    const tablesToCheck = [
      { name: 'device_signals', column: 'project_id' },
      { name: 'device_signals', column: 'device_reference_id' }
    ];

    for (const table of tablesToCheck) {
      try {
        const [tableExists] = await sequelize.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table.name}'`);
        if (Array.isArray(tableExists) && tableExists.length > 0) {
          const [columns] = await sequelize.query(`PRAGMA table_info('${table.name}')`);
          const hasColumn = Array.isArray(columns) && 
            (columns as any[]).some(col => col.name === table.column);
          
          if (!hasColumn && table.column === 'project_id') {
            console.log(`📝 Добавление ${table.column} в ${table.name}...`);
            await sequelize.query(`ALTER TABLE ${table.name} ADD COLUMN ${table.column} INTEGER DEFAULT 1`);
            await sequelize.query(`UPDATE ${table.name} SET ${table.column} = 1 WHERE ${table.column} IS NULL`);
            console.log(`✅ Колонка ${table.column} добавлена в ${table.name}`);
          }
        }
      } catch (error: any) {
        if (!error.message.includes('duplicate column name')) {
          console.error(`⚠️  Ошибка при проверке ${table.name}.${table.column}:`, error.message);
        }
      }
    }

    // Проверяем количество записей после исправления
    const [deviceReferencesCount] = await sequelize.query(`SELECT COUNT(*) as count FROM device_references WHERE project_id IS NOT NULL`);
    const [devicesCount] = await sequelize.query(`SELECT COUNT(*) as count FROM devices WHERE project_id IS NOT NULL`);
    const [projectsCount] = await sequelize.query(`SELECT COUNT(*) as count FROM projects`);

    console.log('📊 Статистика после исправления:');
    console.log(`   - Проекты: ${(projectsCount as any[])[0]?.count || 0}`);
    console.log(`   - Device References с project_id: ${(deviceReferencesCount as any[])[0]?.count || 0}`);
    console.log(`   - Devices с project_id: ${(devicesCount as any[])[0]?.count || 0}`);

    console.log('✅ Исправление базы данных завершено успешно!');

  } catch (error) {
    console.error('❌ Ошибка при исправлении базы данных:', error);
    throw error;
  }
}

// Запускаем скрипт
if (require.main === module) {
  fixDatabase()
    .then(() => {
      console.log('🎉 Скрипт исправления завершен');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Критическая ошибка:', error);
      process.exit(1);
    });
} 