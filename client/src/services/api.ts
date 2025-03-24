import axios from 'axios';
import { DeviceReference, TreeNode, DeviceFullData } from '../interfaces/DeviceReference';
import { Signal, DeviceSignal, SignalSummary } from '../interfaces/Signal';
import { DeviceTypeSignal, SignalsSummary } from '../interfaces/DeviceTypeSignal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Базовый экземпляр axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Сервис для работы с устройствами
export const deviceService = {
  // Получить все устройства
  getAllDevices: async (): Promise<DeviceReference[]> => {
    console.log('API: вызов getAllDevices');
    try {
      const response = await api.get('/device-references');
      console.log('API: getAllDevices получены данные:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: ошибка в getAllDevices:', error);
      throw error;
    }
  },
  
  // Получить дерево устройств
  getDeviceTree: async (): Promise<TreeNode[]> => {
    console.log('API: вызов getDeviceTree');
    try {
      const response = await api.get('/device-references/tree');
      console.log('API: getDeviceTree получены данные:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: ошибка в getDeviceTree:', error);
      throw error;
    }
  },
  
  // Получить детали устройства по ID
  getDeviceById: async (id: number): Promise<DeviceFullData> => {
    console.log(`API: вызов getDeviceById с id=${id}`);
    try {
      const response = await api.get(`/device-references/${id}`);
      console.log('API: getDeviceById получены данные:', response.data);
      return response.data;
    } catch (error) {
      console.error(`API: ошибка в getDeviceById(${id}):`, error);
      throw error;
    }
  },
  
  // Создать новое устройство
  createDevice: async (deviceData: any): Promise<DeviceFullData> => {
    console.log('API: вызов createDevice с данными:', deviceData);
    try {
      const response = await api.post('/device-references', deviceData);
      console.log('API: createDevice получен ответ:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: ошибка в createDevice:', error);
      throw error;
    }
  },
  
  // Удалить устройство по ID
  deleteDeviceById: async (id: number): Promise<void> => {
    console.log(`API: вызов deleteDeviceById с id=${id}`);
    try {
      console.log(`API: отправляем DELETE запрос к /device-references/${id}`);
      const response = await api.delete(`/device-references/${id}`);
      console.log(`API: устройство с id=${id} успешно удалено, статус:`, response.status);
      console.log(`API: ответ сервера:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`API: ошибка в deleteDeviceById(${id}):`, error);
      if (error.response) {
        console.error(`API: статус ошибки:`, error.response.status);
        console.error(`API: данные ошибки:`, error.response.data);
      } else if (error.request) {
        console.error(`API: запрос отправлен, но ответ не получен:`, error.request);
      } else {
        console.error(`API: ошибка при настройке запроса:`, error.message);
      }
      throw error;
    }
  },
  
  // Очистить базу данных устройств
  clearAllDevices: async (): Promise<any> => {
    console.log('API: вызов clearAllDevices');
    try {
      const response = await api.delete('/devices/clear');
      console.log('API: база данных устройств очищена:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('API: ошибка в clearAllDevices:', error);
      if (error.response) {
        console.error('API: статус ошибки:', error.response.status);
        console.error('API: данные ошибки:', error.response.data);
      }
      throw error;
    }
  },
  
  // Очистить базу данных справочников
  clearAllReferences: async (): Promise<any> => {
    console.log('API: вызов clearAllReferences');
    try {
      const response = await api.delete('/device-references/clear');
      console.log('API: база данных справочников очищена:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('API: ошибка в clearAllReferences:', error);
      if (error.response) {
        console.error('API: статус ошибки:', error.response.status);
        console.error('API: данные ошибки:', error.response.data);
      }
      throw error;
    }
  },
  
  // Поиск устройств
  searchDevices: async (query: string): Promise<DeviceReference[]> => {
    console.log(`API: вызов searchDevices с query="${query}"`);
    try {
      const response = await api.get(`/device-references/search?query=${encodeURIComponent(query)}`);
      console.log('API: searchDevices получены данные:', response.data);
      return response.data;
    } catch (error) {
      console.error(`API: ошибка в searchDevices("${query}"):`, error);
      throw error;
    }
  }
};

// Сервис для работы с KIP
export const kipService = {
  getAllKips: async () => {
    const response = await api.get('/kips');
    return response.data;
  },
  
  getKipById: async (id: number) => {
    const response = await api.get(`/kips/${id}`);
    return response.data;
  },
  
  createKip: async (kipData: any) => {
    const response = await api.post('/kips', kipData);
    return response.data;
  },
  
  updateKip: async (id: number, kipData: any) => {
    const response = await api.put(`/kips/${id}`, kipData);
    return response.data;
  },
  
  deleteKip: async (id: number) => {
    const response = await api.delete(`/kips/${id}`);
    return response.data;
  }
};

// Сервис для работы с ZRA
export const zraService = {
  getAllZras: async () => {
    const response = await api.get('/zras');
    return response.data;
  },
  
  getZraById: async (id: number) => {
    const response = await api.get(`/zras/${id}`);
    return response.data;
  },
  
  createZra: async (zraData: any) => {
    const response = await api.post('/zras', zraData);
    return response.data;
  },
  
  updateZra: async (id: number, zraData: any) => {
    const response = await api.put(`/zras/${id}`, zraData);
    return response.data;
  },
  
  deleteZra: async (id: number) => {
    const response = await api.delete(`/zras/${id}`);
    return response.data;
  }
};

// Сервис для работы с импортом данных
export const importService = {
  // Импорт данных КИП из CSV файла
  importKipFromCsv: async (file: File): Promise<{ success: boolean; message: string; count?: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post('/import/kip', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('API: ошибка в importKipFromCsv:', error);
      throw error;
    }
  },
  
  // Импорт данных ЗРА из CSV файла
  importZraFromCsv: async (file: File): Promise<{ success: boolean; message: string; count?: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post('/import/zra', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('API: ошибка в importZraFromCsv:', error);
      throw error;
    }
  },
  
  // Импорт категорий сигналов из CSV файла
  importSignalCategoriesFromCsv: async (file: File): Promise<{ success: boolean; message: string; count?: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post('/import/signal-categories', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('API: ошибка в importSignalCategoriesFromCsv:', error);
      throw error;
    }
  },
  
  // Назначение сигналов устройствам определенного типа
  assignSignalsToDevicesByType: async (deviceType: string): Promise<{ success: boolean; message: string; count?: number }> => {
    try {
      const response = await api.post(`/import/assign-signals/${deviceType}`);
      return response.data;
    } catch (error) {
      console.error(`API: ошибка в assignSignalsToDevicesByType(${deviceType}):`, error);
      throw error;
    }
  },
  
  // Назначение сигналов всем типам устройств
  assignSignalsToAllDeviceTypes: async (): Promise<{ success: boolean; message: string; count?: number }> => {
    try {
      const response = await api.post('/import/assign-signals-all');
      return response.data;
    } catch (error) {
      console.error('API: ошибка в assignSignalsToAllDeviceTypes:', error);
      throw error;
    }
  },
  
  // Получение статистики импорта
  getImportStats: async (): Promise<any> => {
    try {
      const response = await api.get('/import/stats');
      return response.data;
    } catch (error) {
      console.error('API: ошибка в getImportStats:', error);
      throw error;
    }
  },
};

// Сервис для работы с сигналами
export const signalService = {
  // Получить все сигналы
  getAllSignals: async (): Promise<Signal[]> => {
    try {
      const response = await api.get('/signals');
      return response.data;
    } catch (error) {
      console.error('API: ошибка в getAllSignals:', error);
      throw error;
    }
  },
  
  // Получить сигналы по типу
  getSignalsByType: async (type: 'AI' | 'AO' | 'DI' | 'DO'): Promise<Signal[]> => {
    try {
      const response = await api.get(`/signals/type/${type}`);
      return response.data;
    } catch (error) {
      console.error(`API: ошибка в getSignalsByType(${type}):`, error);
      throw error;
    }
  },
  
  // Получить сводку по сигналам
  getSignalsSummary: async (): Promise<SignalSummary[]> => {
    try {
      const response = await api.get('/signals/summary');
      return response.data;
    } catch (error) {
      console.error('API: ошибка в getSignalsSummary:', error);
      throw error;
    }
  },
  
  // Получить сигналы для конкретного устройства
  getDeviceSignals: async (deviceId: number): Promise<DeviceSignal[]> => {
    try {
      const response = await api.get(`/signals/device/${deviceId}`);
      return response.data;
    } catch (error) {
      console.error(`API: ошибка в getDeviceSignals(${deviceId}):`, error);
      throw error;
    }
  },
  
  // Создать новый сигнал
  createSignal: async (signalData: Omit<Signal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Signal> => {
    try {
      const response = await api.post('/signals', signalData);
      return response.data;
    } catch (error) {
      console.error('API: ошибка в createSignal:', error);
      throw error;
    }
  },
  
  // Обновить сигнал
  updateSignal: async (id: number, signalData: Partial<Signal>): Promise<Signal> => {
    try {
      const response = await api.put(`/signals/${id}`, signalData);
      return response.data;
    } catch (error) {
      console.error(`API: ошибка в updateSignal(${id}):`, error);
      throw error;
    }
  },
  
  // Удалить сигнал
  deleteSignal: async (id: number): Promise<void> => {
    try {
      await api.delete(`/signals/${id}`);
    } catch (error) {
      console.error(`API: ошибка в deleteSignal(${id}):`, error);
      throw error;
    }
  },
  
  // Назначить сигнал устройству
  assignSignalToDevice: async (deviceId: number, signalId: number, count: number): Promise<DeviceSignal> => {
    try {
      console.log(`Отправка запроса assignSignalToDevice: deviceId=${deviceId}, signalId=${signalId}, count=${count}`);
      const response = await api.post('/signals/assign', { deviceId, signalId, count });
      console.log('Успешный ответ от assignSignalToDevice:', response.data);
      return response.data;
    } catch (error: any) {
      // Выводим более подробную информацию об ошибке
      const errorMessage = error.response?.data?.error || 'Неизвестная ошибка';
      const statusCode = error.response?.status || 'Неизвестный код';
      console.error(`API: ошибка в assignSignalToDevice(${deviceId}, ${signalId}): ${statusCode} - ${errorMessage}`, error);
      throw error;
    }
  },
  
  // Удалить назначение сигнала устройству
  removeSignalFromDevice: async (deviceId: number, signalId: number): Promise<void> => {
    try {
      await api.delete(`/signals/device/${deviceId}/signal/${signalId}`);
    } catch (error) {
      console.error(`API: ошибка в removeSignalFromDevice(${deviceId}, ${signalId}):`, error);
      throw error;
    }
  },
  
  // Удалить все сигналы
  clearAllSignals: async (): Promise<any> => {
    try {
      const response = await api.delete('/signals/clear');
      console.log('API: все сигналы удалены:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: ошибка в clearAllSignals:', error);
      throw error;
    }
  }
};

// Сервис для работы с сигналами типов устройств
export const deviceTypeSignalService = {
  // Получить все записи о сигналах типов устройств
  getAllDeviceTypeSignals: async (): Promise<DeviceTypeSignal[]> => {
    try {
      const response = await api.get('/device-type-signals');
      return response.data;
    } catch (error) {
      console.error('API: ошибка в getAllDeviceTypeSignals:', error);
      throw error;
    }
  },
  
  // Получить список уникальных типов устройств
  getUniqueDeviceTypes: async (): Promise<string[]> => {
    try {
      const response = await api.get('/device-type-signals/unique-device-types');
      return response.data;
    } catch (error) {
      console.error('API: ошибка в getUniqueDeviceTypes:', error);
      throw error;
    }
  },
  
  // Получить список уникальных типов устройств из справочника DeviceReference
  getUniqueDeviceTypesFromReference: async (): Promise<string[]> => {
    try {
      console.log('API: вызов getUniqueDeviceTypesFromReference');
      const response = await api.get('/device-type-signals/unique-device-types-reference');
      console.log('API: getUniqueDeviceTypesFromReference получены данные:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: ошибка в getUniqueDeviceTypesFromReference:', error);
      throw error;
    }
  },
  
  // Получить сводную таблицу сигналов
  getSignalsSummary: async (): Promise<SignalsSummary> => {
    try {
      const response = await api.get('/device-type-signals/summary');
      return response.data;
    } catch (error) {
      console.error('API: ошибка в getSignalsSummary:', error);
      throw error;
    }
  },
  
  // Получить запись для конкретного типа устройства
  getDeviceTypeSignalByType: async (deviceType: string): Promise<DeviceTypeSignal> => {
    try {
      const response = await api.get(`/device-type-signals/type/${deviceType}`);
      return response.data;
    } catch (error) {
      console.error(`API: ошибка в getDeviceTypeSignalByType(${deviceType}):`, error);
      throw error;
    }
  },
  
  // Обновить или создать запись для типа устройства
  updateDeviceTypeSignal: async (deviceTypeSignal: DeviceTypeSignal): Promise<DeviceTypeSignal> => {
    try {
      const response = await api.post('/device-type-signals', deviceTypeSignal);
      return response.data;
    } catch (error) {
      console.error(`API: ошибка в updateDeviceTypeSignal:`, error);
      throw error;
    }
  },
  
  // Удалить запись для типа устройства
  deleteDeviceTypeSignal: async (deviceType: string): Promise<void> => {
    try {
      await api.delete(`/device-type-signals/type/${deviceType}`);
    } catch (error) {
      console.error(`API: ошибка в deleteDeviceTypeSignal(${deviceType}):`, error);
      throw error;
    }
  },
  
  // Очистить все записи в таблице сигналов типов устройств
  clearAllDeviceTypeSignals: async (): Promise<void> => {
    try {
      console.log('API: вызов clearAllDeviceTypeSignals');
      const response = await api.delete('/device-type-signals/clear');
      console.log('API: таблица сигналов типов устройств очищена:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('API: ошибка в clearAllDeviceTypeSignals:', error);
      if (error.response) {
        console.error('API: статус ошибки:', error.response.status);
        console.error('API: данные ошибки:', error.response.data);
      }
      throw error;
    }
  }
};

// Сервис для работы с базой данных
export const databaseService = {
  // Получить список всех таблиц
  getAllTables: async (): Promise<string[]> => {
    try {
      const response = await api.get('/database/tables');
      console.log('API: получен список таблиц:', response.data);
      return response.data.tables || [];
    } catch (error) {
      console.error('API: ошибка в getAllTables:', error);
      throw error;
    }
  },
  
  // Очистить конкретную таблицу
  clearTable: async (tableName: string): Promise<any> => {
    try {
      const response = await api.delete(`/database/tables/${tableName}`);
      console.log(`API: таблица ${tableName} очищена:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`API: ошибка в clearTable(${tableName}):`, error);
      throw error;
    }
  }
};

export default api; 