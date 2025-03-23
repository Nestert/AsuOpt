import React, { useState, useEffect } from 'react';
// Импортируем патч для совместимости с React 19
import '@ant-design/v5-patch-for-react-19';
import { ConfigProvider, Layout, Tabs, App } from 'antd';
import ruRU from 'antd/es/locale/ru_RU';
import DeviceTree from './components/DeviceTree';
import DeviceDetails from './components/DeviceDetails';
import ImportData from './components/ImportData';
import DatabaseActions from './components/DatabaseActions';
import './App.css';

const { Header, Sider, Content } = Layout;

// Внутренний компонент, который будет иметь доступ к контексту App
const InnerApp: React.FC = () => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [treeUpdateCounter, setTreeUpdateCounter] = useState<number>(0);
  
  // Теперь notification доступен внутри компонента App
  const { notification } = App.useApp();
  
  // Проверяем конфигурацию API при загрузке
  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    console.log('App: API URL = ', apiUrl);
    console.log('App: process.env.NODE_ENV = ', process.env.NODE_ENV);
  }, []);

  // Обработчик выбора устройства
  const handleDeviceSelect = (deviceId: number) => {
    setSelectedDeviceId(deviceId);
  };

  // Обработчик смены вкладки
  const handleTabChange = (key: string) => {
    // Дополнительная логика по смене вкладки может быть добавлена здесь
    console.log(`Активная вкладка: ${key}`);
  };

  // Обработчик успешного импорта
  const handleImportSuccess = (message: string) => {
    notification.success({
      message: 'Успешный импорт',
      description: message,
      duration: 5
    });
    // Обновляем дерево устройств после импорта
    setTreeUpdateCounter(prev => prev + 1);
  };

  // Обработчик ошибки импорта
  const handleImportError = (error: string) => {
    notification.error({
      message: 'Ошибка импорта',
      description: error,
      duration: 5
    });
  };

  // Обработчик удаления устройства
  const handleDeviceDeleted = () => {
    console.log('App: handleDeviceDeleted вызван');
    notification.success({
      message: 'Устройство удалено',
      description: 'Устройство и связанные данные успешно удалены',
      duration: 5
    });
    
    // Сбрасываем выбранное устройство
    console.log('App: сбрасываем выбранное устройство, текущее значение:', selectedDeviceId);
    setSelectedDeviceId(null);
    
    // Обновляем дерево устройств с небольшой задержкой
    console.log('App: увеличиваем счетчик обновления дерева, текущее значение:', treeUpdateCounter);
    
    // Используем таймаут, чтобы дать время серверу обработать удаление
    setTimeout(() => {
      setTreeUpdateCounter(prev => prev + 1);
      console.log('App: дерево устройств обновлено');
    }, 500);
  };

  // Обработчик обновления устройства
  const handleDeviceUpdated = () => {
    console.log('App: handleDeviceUpdated вызван');
    
    // Обновляем дерево устройств с небольшой задержкой
    console.log('App: увеличиваем счетчик обновления дерева для отражения изменений');
    
    // Используем таймаут, чтобы дать время серверу завершить обновление
    setTimeout(() => {
      setTreeUpdateCounter(prev => prev + 1);
      console.log('App: дерево устройств обновлено после изменения устройства');
    }, 500);
  };

  // Обработчик добавления устройства
  const handleDeviceAdded = () => {
    console.log('App: handleDeviceAdded вызван');
    notification.success({
      message: 'Устройство добавлено',
      description: 'Новое устройство успешно добавлено',
      duration: 5
    });
    
    // Обновляем дерево устройств с небольшой задержкой
    setTimeout(() => {
      setTreeUpdateCounter(prev => prev + 1);
      console.log('App: дерево устройств обновлено после добавления устройства');
    }, 500);
  };

  // Обработчик очистки базы данных
  const handleDatabaseCleared = () => {
    console.log('App: handleDatabaseCleared вызван');
    notification.success({
      message: 'База данных обновлена',
      description: 'Операция выполнена успешно',
      duration: 5
    });
    // Сбрасываем выбранное устройство
    setSelectedDeviceId(null);
    // Обновляем дерево устройств
    setTreeUpdateCounter(prev => prev + 1);
  };

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <h1>АСУ-Оптимизация</h1>
      </Header>
      
      <Layout className="main-layout">
        <Tabs 
          defaultActiveKey="devices" 
          onChange={handleTabChange}
          type="card"
          className="main-tabs"
          items={[
            {
              key: 'devices',
              label: 'Устройства',
              children: (
                <Layout className="content-layout">
                  <Sider width={350} className="app-sider">
                    <DeviceTree 
                      onSelectDevice={handleDeviceSelect}
                      updateCounter={treeUpdateCounter}
                    />
                  </Sider>
                  <Content className="app-content">
                    <DeviceDetails 
                      deviceId={selectedDeviceId}
                      onDeviceDeleted={handleDeviceDeleted}
                      onDeviceUpdated={handleDeviceUpdated}
                    />
                  </Content>
                </Layout>
              )
            },
            {
              key: 'import',
              label: 'Импорт данных',
              children: (
                <Layout className="content-layout">
                  <Content className="app-content">
                    <ImportData 
                      onImportSuccess={handleImportSuccess} 
                      onImportError={handleImportError} 
                    />
                  </Content>
                </Layout>
              )
            },
            {
              key: 'database',
              label: 'Управление БД',
              children: (
                <Layout className="content-layout">
                  <Content className="app-content">
                    <DatabaseActions 
                      onDatabaseCleared={handleDatabaseCleared}
                    />
                  </Content>
                </Layout>
              )
            }
          ]}
        />
      </Layout>
    </Layout>
  );
};

// Основной компонент приложения
const AppComponent: React.FC = () => {
  return (
    <ConfigProvider 
      locale={ruRU}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 4,
        },
      }}
    >
      <App>
        <InnerApp />
      </App>
    </ConfigProvider>
  );
};

export default AppComponent;
