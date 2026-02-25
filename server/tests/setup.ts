process.env.NODE_ENV = 'test';

import { QueryTypes } from 'sequelize';
import { sequelize, initializeDatabase } from '../src/config/database';
import { initializeModels } from '../src/config/initializeModels';

const TEST_TABLE_RESET_ORDER = [
  'device_signals',
  'device_type_signals',
  'signals',
  'zras',
  'kips',
  'device_references',
  'devices',
  'projects',
] as const;

const getExistingTables = async (): Promise<Set<string>> => {
  const rows = await sequelize.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table';",
    { type: QueryTypes.SELECT }
  );
  return new Set(rows.map((row) => row.name));
};

const resetTestDb = async (): Promise<void> => {
  const existingTables = await getExistingTables();
  const tables = TEST_TABLE_RESET_ORDER.filter((table) => existingTables.has(table));

  await sequelize.query('PRAGMA foreign_keys = OFF;');
  try {
    for (const table of tables) {
      await sequelize.query(`DELETE FROM ${table}`);
    }

    if (existingTables.has('sqlite_sequence')) {
      for (const table of tables) {
        await sequelize.query(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
      }
    }

    if (existingTables.has('projects')) {
      await sequelize.query(`
        INSERT OR IGNORE INTO projects (id, name, code, description, status)
        VALUES (1, 'Основной проект', 'DEFAULT', 'Проект по умолчанию для существующих данных', 'active')
      `);
    }
  } finally {
    await sequelize.query('PRAGMA foreign_keys = ON;');
  }
};

// Настройка для тестов
beforeAll(async () => {
  try {
    // Инициализируем базу данных в памяти
    await initializeDatabase();
    await initializeModels();
  } catch (error) {
    console.error('Ошибка настройки тестовой базы данных:', error);
    throw error;
  }
});

// Очистка после каждого теста
afterEach(async () => {
  try {
    await resetTestDb();
  } catch (error) {
    console.error('Ошибка очистки базы данных:', error);
    throw error;
  }
});

// Закрываем соединение после всех тестов
afterAll(async () => {
  try {
    await sequelize.close();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Database is closed') || message.includes('SQLITE_MISUSE')) {
      return;
    }
    console.error('Ошибка закрытия соединения с базой данных:', error);
    throw error;
  }
});
