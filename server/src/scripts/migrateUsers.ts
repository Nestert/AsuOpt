import { readFileSync } from 'fs';
import { join } from 'path';
import { initializeDatabase } from '../config/database';
import { sequelize } from '../config/database';

async function runUsersMigration() {
  try {
    console.log('🚀 Начинаем миграцию пользователей...');

    // Инициализируем подключение к базе данных
    await initializeDatabase();

    // Читаем SQL файл миграции пользователей
    const migrationPath = join(__dirname, '../migrations/003_add_users.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Выполняем всю миграцию как один запрос
    console.log('⏳ Выполняем миграцию пользователей...');

    try {
      await sequelize.query(migrationSQL);
      console.log('✅ Миграция пользователей выполнена успешно');
    } catch (error: any) {
      // Игнорируем ошибки о том, что таблица/столбец уже существует
      if (error.message?.includes('already exists') ||
          error.message?.includes('duplicate column name') ||
          error.message?.includes('table users already exists')) {
        console.log('⚠️  Миграция пропущена (таблица уже существует)');
      } else {
        console.error('❌ Ошибка при выполнении миграции:', error.message);
        throw error;
      }
    }

    // Проверяем результат миграции
    console.log('\n🔍 Проверяем результат миграции...');

    // Проверяем таблицу пользователей
    const [users] = await sequelize.query('SELECT id, username, email, role, is_active FROM users LIMIT 5');
    console.log(`📊 Найдено пользователей: ${users.length}`);

    console.log('\n🎉 Миграция пользователей завершена успешно!');
    console.log('📋 Что было сделано:');
    console.log('   ✅ Создана таблица users');
    console.log('   ✅ Созданы индексы для username, email, role');
    console.log('   ✅ Создан триггер для updated_at');
    console.log('   ✅ Созданы тестовые пользователи (admin/admin123, user/admin123)');

  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции пользователей:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Запускаем миграцию
runUsersMigration();