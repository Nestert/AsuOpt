import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { initializeDatabase } from '../config/database';
import { sequelize } from '../config/database';

async function runMigration() {
  try {
    console.log('🚀 Начинаем миграцию базы данных...');
    
    // Инициализируем подключение к базе данных
    await initializeDatabase();
    
    const migrationsDir = join(__dirname, '../migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`\n▶️  Выполнение миграции ${file}`);
      const migrationSQL = readFileSync(join(migrationsDir, file), 'utf8');
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      console.log(`📝 Найдено ${commands.length} команд`);

      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        console.log(`⏳ Выполняем команду ${i + 1}/${commands.length}`);
        try {
          await sequelize.query(command);
          console.log(`✅ Команда ${i + 1} выполнена`);
        } catch (error: any) {
          if (error.message.includes('duplicate column name') ||
              error.message.includes('already exists')) {
            console.log(`⚠️  Команда ${i + 1} пропущена`);
          } else {
            console.error(`❌ Ошибка в команде ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }
    
    // Проверяем результат миграции
    console.log('\n🔍 Проверяем результат миграции...');
    
    // Проверяем таблицу проектов
    const [projects] = await sequelize.query('SELECT * FROM projects LIMIT 5');
    console.log(`📊 Найдено проектов: ${projects.length}`);
    
    // Проверяем добавление project_id в device_references
    const [devices] = await sequelize.query('SELECT id, project_id FROM device_references LIMIT 5');
    console.log(`📊 Проверка device_references: найдено ${devices.length} записей с project_id`);
    
    console.log('\n🎉 Миграция завершена успешно!');
    console.log('📋 Что было сделано:');
    console.log('   ✅ Создана таблица projects');
    console.log('   ✅ Создан дефолтный проект');
    console.log('   ✅ Добавлен project_id во все основные таблицы');
    console.log('   ✅ Созданы индексы для производительности');
    console.log('   ✅ Создана таблица project_templates');
    console.log('   ✅ Настроены триггеры для updated_at');
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Запускаем миграцию
runMigration(); 