import { sequelize } from './database';
import { Project } from '../models/Project';
import { Device } from '../models/Device';
import { DeviceReference } from '../models/DeviceReference';
import { Kip } from '../models/Kip';
import { Zra } from '../models/Zra';
import { Signal } from '../models/Signal';
import { DeviceSignal } from '../models/DeviceSignal';
import { DeviceTypeSignal } from '../models/DeviceTypeSignal';
import { User } from '../models/User';

export const initializeModels = async () => {
  console.log('🔧 Инициализация моделей...');

  try {
    // Инициализация всех моделей
    User.initialize(sequelize);
    Project.initialize(sequelize);
    Device.initialize(sequelize);
    DeviceReference.initialize(sequelize);
    Kip.initialize(sequelize);
    Zra.initialize(sequelize);
    Signal.initialize(sequelize);
    DeviceSignal.initialize(sequelize);
    DeviceTypeSignal.initialize(sequelize);

    console.log('✅ Модели инициализированы');

    // Устанавливаем ассоциации между моделями
    console.log('🔗 Установка ассоциаций...');
    
    User.associate();
    Project.associate();
    Device.associate();
    DeviceReference.associate();
    Kip.associate();
    Zra.associate();
    Signal.associate();
    DeviceSignal.associate();

    console.log('✅ Ассоциации установлены');

    // Синхронизируем модели с базой данных
    console.log('🔄 Синхронизация с базой данных...');
    await sequelize.sync({ force: false });
    console.log('✅ Синхронизация завершена');

  } catch (error) {
    console.error('❌ Ошибка при инициализации моделей:', error);
    throw error;
  }
}; 