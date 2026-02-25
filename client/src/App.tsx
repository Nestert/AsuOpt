import React, { useState, useEffect, useCallback } from 'react';
// Импортируем патч для совместимости с React 19
import '@ant-design/v5-patch-for-react-19';
import { ConfigProvider, Layout, Tabs, App, Space, Spin, Button, Dropdown } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import ruRU from 'antd/es/locale/ru_RU';
import DeviceTree from './components/DeviceTree';
import DeviceDetails from './components/DeviceDetails';
import BatchEditModal from './components/BatchEditModal';
import QuestionnaireModal from './components/QuestionnaireModal';
import ImportData from './components/ImportData';
import DatabaseActions from './components/DatabaseActions';
import SignalManagement from './components/SignalManagement';
import DataExport from './components/DataExport';
import ProjectSelector from './components/ProjectSelector';
import ProjectManagement from './components/ProjectManagement';
import Login from './components/Login';
import Register from './components/Register';
import { ProjectProvider, useProject } from './contexts/ProjectContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

const { Header, Sider, Content } = Layout;

// Компонент с аутентификацией и маршрутизацией
const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthWrapper />;
  }

  return <InnerApp />;
};


// Компонент для управления отображением Login/Register
const AuthWrapper: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return isLogin ? (
    <Login onSwitchToRegister={() => setIsLogin(false)} />
  ) : (
    <Register onSwitchToLogin={() => setIsLogin(true)} />
  );
};

// Внутренний компонент основного приложения
const InnerApp: React.FC = () => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<number[]>([]);
  const [treeUpdateCounter, setTreeUpdateCounter] = useState<number>(0);
  const [projectManagementVisible, setProjectManagementVisible] = useState(false);
  const [batchEditVisible, setBatchEditVisible] = useState(false);
  const [questionnaireVisible, setQuestionnaireVisible] = useState(false);
  const [questionnaireDeviceIds, setQuestionnaireDeviceIds] = useState<number[]>([]);

  // Теперь notification доступен внутри компонента App
  const { notification } = App.useApp();

  // Используем контексты
  const { currentProjectId, setCurrentProjectId, refreshProjects } = useProject();
  const { user, logout } = useAuth();

  // Обработчик выхода
  const handleLogout = () => {
    logout();
    notification.success({
      message: 'Выход выполнен',
      description: 'Вы успешно вышли из системы',
      duration: 3
    });
  };

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

  // Обработчик множественного выбора устройств
  const handleSelectDevices = useCallback((deviceIds: number[]) => {
    setSelectedDeviceIds(deviceIds);
    // Также устанавливаем первое выбранное устройство для одиночного просмотра
    if (deviceIds.length > 0) {
      setSelectedDeviceId(deviceIds[0]);
    } else {
      setSelectedDeviceId(null);
    }
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

  // Меню пользователя
  const userMenuItems = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '8px 0' }}>
          <div><strong>{user?.username}</strong></div>
          <div style={{ fontSize: '12px', color: '#666' }}>{user?.email}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Роль: {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}</div>
        </div>
      ),
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, color: 'white' }}>АСУ-Оптимизация</h1>
          <Space>
            <ProjectSelector
              currentProjectId={currentProjectId}
              onProjectChange={handleProjectChange}
              onManageProjects={handleManageProjects}
            />
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button
                type="text"
                icon={<UserOutlined />}
                style={{ color: 'white' }}
              >
                {user?.username}
              </Button>
            </Dropdown>
          </Space>
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
                      onSelectDevices={handleSelectDevices}
                      onOpenBatchEdit={(deviceIds) => {
                        setSelectedDeviceIds(deviceIds);
                        setBatchEditVisible(true);
                      }}
                      onGenerateQuestionnaire={(deviceIds) => {
                        setQuestionnaireDeviceIds(deviceIds);
                        setQuestionnaireVisible(true);
                      }}
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
              key: 'export',
              label: 'Экспорт данных',
              children: (
                <Layout className="content-layout">
                  <Content className="app-content">
                    <DataExport />
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

      {/* Модальное окно массового редактирования */}
      <BatchEditModal
        visible={batchEditVisible}
        deviceIds={selectedDeviceIds}
        onClose={() => {
          setBatchEditVisible(false);
          setSelectedDeviceIds([]);
        }}
        onSuccess={() => {
          setTreeUpdateCounter(prev => prev + 1);
        }}
      />

      {/* Модальное окно генерации опросного листа */}
      <QuestionnaireModal
        visible={questionnaireVisible}
        deviceIds={questionnaireDeviceIds}
        onClose={() => {
          setQuestionnaireVisible(false);
          setQuestionnaireDeviceIds([]);
        }}
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
        <AuthProvider>
          <ProjectProvider>
            <MainApp />
          </ProjectProvider>
        </AuthProvider>
      </App>
    </ConfigProvider>
  );
};

export default AppComponent;
