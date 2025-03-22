import React, { useState } from 'react';
import { ConfigProvider, Layout, notification, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import type { NotificationArgsProps } from 'antd';
import ruRU from 'antd/es/locale/ru_RU';
import DeviceTree from './components/DeviceTree';
import DeviceDetails from './components/DeviceDetails';
import ImportData from './components/ImportData';
import './App.css';

const { Header, Sider, Content } = Layout;

// Основной компонент приложения
const App: React.FC = () => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  
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
  };

  // Обработчик ошибки импорта
  const handleImportError = (error: string) => {
    notification.error({
      message: 'Ошибка импорта',
      description: error,
      duration: 5
    });
  };

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
                      <DeviceTree onSelectDevice={handleDeviceSelect} />
                    </Sider>
                    <Content className="app-content">
                      <DeviceDetails deviceId={selectedDeviceId} />
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
              }
            ]}
          />
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
