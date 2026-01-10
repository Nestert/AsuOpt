import { sequelize, initializeDatabase } from '../src/config/database';
import { initializeModels } from '../src/config/initializeModels';

// Настройка для тестов
beforeAll(async () => {
  // Устанавливаем переменную окружения для тестов
  process.env.NODE_ENV = 'test';

  try {
    // Инициализируем базу данных в памяти
    await initializeDatabase();
    await initializeModels();
  } catch (error) {
    console.error('Ошибка настройки тестовой базы данных:', error);
  }
});

// Очистка после каждого теста
afterEach(async () => {
  try {
    // Очищаем все таблицы в порядке, обратном зависимостям
    const tables = [
      'device_signals',
      'device_type_signals',
      'signals',
      'zras',
      'kips',
      'device_references',
      'devices',
      'projects'
    ];

    for (const table of tables) {
      await sequelize.query(`DELETE FROM ${table}`);
    }

    // Сбрасываем автоинкремент
    for (const table of tables) {
      await sequelize.query(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
    }

    // Создаем дефолтный проект для тестов
    await sequelize.query(`
      INSERT OR IGNORE INTO projects (id, name, code, description, status)
      VALUES (1, 'Основной проект', 'DEFAULT', 'Проект по умолчанию для существующих данных', 'active')
    `);
  } catch (error) {
    console.error('Ошибка очистки базы данных:', error);
  }
});

// Закрываем соединение после всех тестов
afterAll(async () => {
  try {
    await sequelize.close();
  } catch (error) {
    console.error('Ошибка закрытия соединения с базой данных:', error);
  }
});