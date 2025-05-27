import React, { useState, useEffect, useCallback } from 'react';
// Импортируем патч для совместимости с React 19
import '@ant-design/v5-patch-for-react-19';
import { ConfigProvider, Layout, Tabs, App, Space } from 'antd';
import ruRU from 'antd/es/locale/ru_RU';
import DeviceTree from './components/DeviceTree';
import DeviceDetails from './components/DeviceDetails';
import ImportData from './components/ImportData';
import DatabaseActions from './components/DatabaseActions';
import SignalManagement from './components/SignalManagement';
import ProjectSelector from './components/ProjectSelector';
import ProjectManagement from './components/ProjectManagement';
import { ProjectProvider, useProject } from './contexts/ProjectContext';
import './App.css';

const { Header, Sider, Content } = Layout;

// Внутренний компонент, который будет иметь доступ к контексту App
const InnerApp: React.FC = () => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [treeUpdateCounter, setTreeUpdateCounter] = useState<number>(0);
  const [projectManagementVisible, setProjectManagementVisible] = useState(false);
  
  // Теперь notification доступен внутри компонента App
  const { notification } = App.useApp();
  
  // Используем контекст проектов
  const { currentProjectId, setCurrentProjectId, refreshProjects } = useProject();
  
  // Проверяем конфигурацию API при загрузке
  useEffect(() => {
    // Удаляем неиспользуемую переменную apiUrl
    // const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    // console.log('App: API URL = ', apiUrl);
    // console.log('App: process.env.NODE_ENV = ', process.env.NODE_ENV);
  }, []);

  // Обработчик выбора устройства
  const handleSelectDevice = useCallback((deviceId: number | null) => {
    setSelectedDeviceId(deviceId);
  }, []);

  // Обработчик смены вкладки
  const handleTabChange = (key: string) => {
    // console.log(`Активная вкладка: ${key}`);
    // При переключении на вкладку устройств, сбрасываем выбор, если это нужно
    if (key !== 'devices') {
      // setSelectedDeviceId(null); 
    }
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
  const handleDeviceDeleted = useCallback(() => {
    // console.log('App: handleDeviceDeleted вызван');
    // Сначала сбрасываем выбранный ID, чтобы панель деталей очистилась
    // или показала сообщение о выборе устройства
    // console.log('App: сбрасываем выбранное устройство, текущее значение:', selectedDeviceId);
    setSelectedDeviceId(null); 
    // Затем увеличиваем счетчик, чтобы DeviceTree обновил данные
    // console.log('App: увеличиваем счетчик обновления дерева, текущее значение:', treeUpdateCounter);
    setTreeUpdateCounter(prev => prev + 1);
    // console.log('App: дерево устройств обновлено');
  }, []);

  // Обработчик обновления устройства
  const handleDeviceUpdated = useCallback(() => {
    // console.log('App: handleDeviceUpdated вызван');
    // Увеличиваем счетчик, чтобы DeviceTree обновил данные
    // console.log('App: увеличиваем счетчик обновления дерева для отражения изменений');
    setTreeUpdateCounter(prev => prev + 1);
    // console.log('App: дерево устройств обновлено после изменения устройства');
  }, []);

  // Обработчик очистки базы данных
  const handleDatabaseCleared = () => {
    // console.log('App: handleDatabaseCleared вызван');
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

  // Обработчики для проектов
  const handleProjectChange = (projectId: number | null) => {
    setCurrentProjectId(projectId);
    // Сбрасываем выбранное устройство при смене проекта
    setSelectedDeviceId(null);
    // Обновляем дерево устройств
    setTreeUpdateCounter(prev => prev + 1);
  };

  const handleManageProjects = () => {
    setProjectManagementVisible(true);
  };

  const handleProjectCreated = () => {
    refreshProjects();
    notification.success({
      message: 'Проект создан',
      description: 'Новый проект успешно создан',
      duration: 3
    });
  };

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, color: 'white' }}>АСУ-Оптимизация</h1>
          <ProjectSelector
            currentProjectId={currentProjectId}
            onProjectChange={handleProjectChange}
            onManageProjects={handleManageProjects}
          />
        </Space>
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
                      onSelectDevice={handleSelectDevice}
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
              key: 'signals',
              label: 'Сигналы',
              children: (
                <Layout className="content-layout">
                  <Content className="app-content">
                    <SignalManagement />
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
      
      {/* Модальное окно управления проектами */}
      <ProjectManagement
        visible={projectManagementVisible}
        onClose={() => setProjectManagementVisible(false)}
        onProjectCreated={handleProjectCreated}
        currentProjectId={currentProjectId}
      />
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
        <ProjectProvider>
          <InnerApp />
        </ProjectProvider>
      </App>
    </ConfigProvider>
  );
};

export default AppComponent;
