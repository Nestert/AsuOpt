import axios from 'axios';
import { DeviceReference, TreeNode, DeviceFullData } from '../interfaces/DeviceReference';

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
  importKipData: async (formData: FormData) => {
    const response = await api.post('/import/kip', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  importZraData: async (formData: FormData) => {
    const response = await api.post('/import/zra', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default api; 