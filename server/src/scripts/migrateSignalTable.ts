import { sequelize } from '../config/database';

async function migrateSignalTable() {
  try {
    console.log('Подключение к базе данных...');
    await sequelize.authenticate();
    console.log('Успешное подключение к базе данных.');

    console.log('Проверяем наличие нужных столбцов в таблице signals...');

    // Получаем информацию о структуре таблицы
    const [tableInfo] = await sequelize.query('PRAGMA table_info(signals);');
    
    // Преобразуем результат в массив имен столбцов
    const columns = tableInfo.map((col: any) => col.name);
    
    console.log('Текущие столбцы таблицы signals:', columns);

    // Проверяем наличие столбца category
    if (!columns.includes('category')) {
      console.log('Добавляем столбец category...');
      await sequelize.query('ALTER TABLE signals ADD COLUMN category TEXT;');
      console.log('Столбец category успешно добавлен.');
    } else {
      console.log('Столбец category уже существует.');
    }

    // Проверяем наличие столбца connectionType
    if (!columns.includes('connectionType')) {
      console.log('Добавляем столбец connectionType...');
      await sequelize.query('ALTER TABLE signals ADD COLUMN connectionType TEXT;');
      console.log('Столбец connectionType успешно добавлен.');
    } else {
      console.log('Столбец connectionType уже существует.');
    }

    // Проверяем наличие столбца voltage
    if (!columns.includes('voltage')) {
      console.log('Добавляем столбец voltage...');
      await sequelize.query('ALTER TABLE signals ADD COLUMN voltage TEXT;');
      console.log('Столбец voltage успешно добавлен.');
    } else {
      console.log('Столбец voltage уже существует.');
    }

    console.log('Миграция таблицы signals успешно завершена.');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при миграции таблицы signals:', error);
    process.exit(1);
  }
}

// Запускаем функцию миграции
migrateSignalTable(); 