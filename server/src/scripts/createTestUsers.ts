import bcrypt from 'bcryptjs';
import { initializeDatabase, sequelize } from '../config/database';
import { initializeModels } from '../config/initializeModels';
import { User } from '../models/User';

async function createTestUsers() {
  try {
    console.log('🚀 Создание тестовых пользователей...');

    await initializeDatabase();
    await initializeModels();

    // Очищаем существующих пользователей для теста
    await User.destroy({ where: {} });
    console.log('🗑️  Очищены существующие пользователи');

    // Создаем администратора
    const admin = await User.create({
      username: 'admin',
      email: 'admin@asuopt.local',
      password: 'admin123', // будет хэширован автоматически
      role: 'admin',
      isActive: true
    });

    // Создаем обычного пользователя
    const user = await User.create({
      username: 'user',
      email: 'user@asuopt.local',
      password: 'admin123', // будет хэширован автоматически
      role: 'user',
      isActive: true
    });

    console.log('Admin created with hashed password');
    console.log('User created with hashed password');

    console.log('✅ Тестовые пользователи созданы');
    console.log('   admin/admin123 (администратор)');
    console.log('   user/admin123 (пользователь)');

    // Проверяем созданных пользователей
    const users = await User.findAll();
    console.log(`📊 Всего пользователей: ${users.length}`);

  } catch (error) {
    console.error('❌ Ошибка при создании пользователей:', error);
  } finally {
    await sequelize.close();
  }
}

createTestUsers();