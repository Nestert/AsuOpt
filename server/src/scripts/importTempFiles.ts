import path from 'path';
import fs from 'fs';
import { ImportService } from '../services/ImportService';
import { initializeDatabase } from '../config/database';

async function importTempFiles() {
  try {
    // Инициализируем базу данных
    await initializeDatabase();
    console.log('База данных инициализирована');

    const tmpDir = path.join(__dirname, '../../tmp');
    
    // Проверяем существование директории
    if (!fs.existsSync(tmpDir)) {
      console.error('Директория tmp не найдена');
      process.exit(1);
    }
    
    // Получаем список файлов
    const files = fs.readdirSync(tmpDir);
    console.log(`Найдено файлов в tmp: ${files.length}`);
    
    // Ищем файлы KIP и ZRA
    const kipFile = files.find(file => file.toLowerCase().includes('kip.csv'));
    const zraFile = files.find(file => file.toLowerCase().includes('zra.csv'));
    
    // Импортируем файлы, если они найдены
    if (kipFile) {
      console.log(`Импортируем файл КИП: ${kipFile}`);
      const kipPath = path.join(tmpDir, kipFile);
      const kipResult = await ImportService.importKipFromCsv(kipPath);
      console.log('Результат импорта КИП:', kipResult);
    } else {
      console.log('Файл КИП не найден');
    }
    
    if (zraFile) {
      console.log(`Импортируем файл ЗРА: ${zraFile}`);
      const zraPath = path.join(tmpDir, zraFile);
      const zraResult = await ImportService.importZraFromCsv(zraPath);
      console.log('Результат импорта ЗРА:', zraResult);
    } else {
      console.log('Файл ЗРА не найден');
    }
    
    // Выводим статистику
    const stats = await ImportService.getImportStats();
    console.log('Статистика после импорта:', stats);
    
    console.log('Импорт завершен');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при импорте файлов:', error);
    process.exit(1);
  }
}

// Запускаем импорт
importTempFiles(); 