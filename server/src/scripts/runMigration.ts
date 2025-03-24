import { Sequelize } from 'sequelize';
import path from 'path';
import fs from 'fs';

// Настройка подключения к базе данных (такая же, как в database.ts)
const dbPath = path.join(__dirname, '../../database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
});

async function runMigration() {
  try {
    console.log('Начало миграции: добавление новых полей в таблицу device_references...');
    
    // Добавляем колонку systemCode
    await sequelize.query(`
      ALTER TABLE device_references 
      ADD COLUMN systemCode TEXT;
    `);
    console.log('Добавлена колонка systemCode');
    
    // Добавляем колонку plcType
    await sequelize.query(`
      ALTER TABLE device_references 
      ADD COLUMN plcType TEXT;
    `);
    console.log('Добавлена колонка plcType');
    
    // Добавляем колонку exVersion
    await sequelize.query(`
      ALTER TABLE device_references 
      ADD COLUMN exVersion TEXT;
    `);
    console.log('Добавлена колонка exVersion');
    
    console.log('Миграция успешно завершена!');
  } catch (error) {
    console.error('Ошибка при выполнении миграции:', error);
  } finally {
    await sequelize.close();
  }
}

// Запуск миграции
runMigration(); 