import React, { useEffect, useState, useCallback } from 'react';
import { Table, Card, Button, Typography, Row, Col, Statistic, Spin, Alert, Empty, App, Switch, Popconfirm, Space } from 'antd';
import { deviceTypeSignalService } from '../services/api';
import { DeviceTypeSignal, SignalsSummary } from '../interfaces/DeviceTypeSignal';
import { ReloadOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// Создаем внутренний компонент, использующий App.useApp()
const SignalTableContent: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SignalsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initializingTypes, setInitializingTypes] = useState(false);
  const [autoFillEnabled, setAutoFillEnabled] = useState(false);

  // Функция для автоматического добавления отсутствующих типов устройств
  const addMissingTypes = useCallback(async (missingTypes: string[]) => {
    setInitializingTypes(true);
    
    try {
      console.log('Добавление недостающих типов устройств:', missingTypes);
      
      // Добавляем каждый тип по очереди
      for (const deviceType of missingTypes) {
        const newData: DeviceTypeSignal = {
          deviceType,
          aiCount: 0,
          aoCount: 0,
          diCount: 0,
          doCount: 0
        };
        
        await deviceTypeSignalService.updateDeviceTypeSignal(newData);
        console.log(`Добавлен новый тип устройства: ${deviceType}`);
      }
      
      // Загружаем обновленные данные после добавления всех типов
      const updatedSummary = await deviceTypeSignalService.getSignalsSummary();
      setSummaryData(updatedSummary);
      
      message.success(`Добавлено ${missingTypes.length} новых типов устройств из справочника`);
    } catch (error) {
      console.error('Ошибка при добавлении типов устройств:', error);
      message.error('Не удалось добавить все типы устройств из справочника');
    } finally {
      setInitializingTypes(false);
    }
  }, [message]);

  // Загрузка данных при монтировании компонента
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Загружаем список всех типов устройств из DeviceReference
      const typesFromReference = await deviceTypeSignalService.getUniqueDeviceTypesFromReference();
      
      try {
        // Загружаем сводную таблицу существующих записей
        const summaryData = await deviceTypeSignalService.getSignalsSummary();
        setSummaryData(summaryData);
        
        // Проверяем, есть ли типы устройств, которых еще нет в таблице сигналов
        if (autoFillEnabled && typesFromReference.length > 0) {
          const existingTypes = summaryData?.deviceTypeSignals.map(dts => dts.deviceType) || [];
          const missingTypes = typesFromReference.filter(type => !existingTypes.includes(type));
          
          // Если есть недостающие типы, добавляем их автоматически
          if (missingTypes.length > 0) {
            await addMissingTypes(missingTypes);
          }
        }
      } catch (summaryError) {
        console.error('Ошибка при загрузке сводных данных:', summaryError);
        setError('Не удалось загрузить полную информацию о сигналах. Данные о сигналах могут быть неточными.');
        
        // Загружаем список всех типов устройств из Device, несмотря на ошибку
        try {
          await deviceTypeSignalService.getUniqueDeviceTypes();
        } catch (typesError) {
          console.error('Ошибка при загрузке типов устройств:', typesError);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      setError('Не удалось загрузить данные. Проверьте соединение с сервером.');
      setLoading(false);
    }
  }, [autoFillEnabled, addMissingTypes]);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Очистка всех данных в таблице сигналов типов устройств
  const clearAllData = async () => {
    setLoading(true);
    try {
      await deviceTypeSignalService.clearAllDeviceTypeSignals();
      message.success('Все данные по типам устройств успешно удалены');
      
      // Обновляем таблицу после удаления
      await fetchData();
    } catch (error) {
      console.error('Ошибка при очистке данных:', error);
      message.error('Не удалось очистить данные типов устройств');
      setLoading(false);
    }
  };

  // Отображение кнопок управления
  const renderActionButtons = () => {
    return (
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Switch 
            checked={autoFillEnabled} 
            onChange={setAutoFillEnabled} 
            checkedChildren="Автозаполнение включено" 
            unCheckedChildren="Автозаполнение выключено"
          />
          <Text type="secondary">
            {autoFillEnabled 
              ? 'Типы устройств будут добавляться автоматически' 
              : 'Автоматическое добавление типов устройств отключено'}
          </Text>
        </Space>
        <Space>
          <Popconfirm
            title="Очистить таблицу"
            description="Вы уверены, что хотите удалить все данные по типам устройств?"
            onConfirm={clearAllData}
            okText="Да"
            cancelText="Отмена"
          >
            <Button 
              danger
              icon={<DeleteOutlined />}
            >
              Очистить таблицу
            </Button>
          </Popconfirm>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchData}
          >
            Обновить данные
          </Button>
        </Space>
      </div>
    );
  };

  // Колонки для таблицы
  const columns = [
    {
      title: 'Тип устройства',
      dataIndex: 'deviceType',
      key: 'deviceType',
      render: (text: string) => <span>{text}</span>
    },
    {
      title: 'Количество устройств',
      dataIndex: 'deviceCount',
      key: 'deviceCount',
      render: (count: number) => <span>{count || 0}</span>
    },
    {
      title: 'AI (Аналоговые входы)',
      dataIndex: 'aiCount',
      key: 'aiCount',
      render: (text: number, record: DeviceTypeSignal) => (
        <span>{text || 0}</span>
      )
    },
    {
      title: 'AO (Аналоговые выходы)',
      dataIndex: 'aoCount',
      key: 'aoCount',
      render: (text: number, record: DeviceTypeSignal) => (
        <span>{text || 0}</span>
      )
    },
    {
      title: 'DI (Дискретные входы)',
      dataIndex: 'diCount',
      key: 'diCount',
      render: (text: number, record: DeviceTypeSignal) => (
        <span>{text || 0}</span>
      )
    },
    {
      title: 'DO (Дискретные выходы)',
      dataIndex: 'doCount',
      key: 'doCount',
      render: (text: number, record: DeviceTypeSignal) => (
        <span>{text || 0}</span>
      )
    },
    {
      title: 'Всего',
      key: 'total',
      render: (_: any, record: DeviceTypeSignal) => {
        const total = record.aiCount + record.aoCount + record.diCount + record.doCount;
        return <span>{total}</span>;
      }
    }
  ];

  // Отображение статистики
  const renderStatistics = () => {
    if (!summaryData) return null;
    
    const { summary } = summaryData;
    
    return (
      <Card title="Общая статистика по сигналам" style={{ marginBottom: 20 }}>
        <Row gutter={16}>
          <Col span={4}>
            <Statistic
              title="Всего устройств"
              value={summary.totalDevices || 0}
              valueStyle={{ color: '#2f54eb' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="Всего AI"
              value={summary.totalAI}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="Всего AO"
              value={summary.totalAO}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="Всего DI"
              value={summary.totalDI}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="Всего DO"
              value={summary.totalDO}
              valueStyle={{ color: '#f5222d' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="Всего сигналов"
              value={summary.totalSignals}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div className="signal-table">
      <Title level={2}>Сводная таблица сигналов по типам устройств</Title>
      
      <Alert
        message="Автоматический подсчет сигналов"
        description="Количество сигналов загружается автоматически из таблицы сигналов устройств. Значения не могут быть изменены вручную."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      {error && (
        <Alert
          message="Ошибка"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      {loading || initializingTypes ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            {initializingTypes ? 'Добавление типов устройств из справочника...' : 'Загрузка данных...'}
          </div>
        </div>
      ) : (
        <>
          {summaryData ? (
            <>
              {renderStatistics()}
              {renderActionButtons()}
              
              <Table 
                columns={columns} 
                dataSource={summaryData.deviceTypeSignals}
                rowKey="deviceType"
                pagination={false}
                bordered
              />
            </>
          ) : (
            <Empty 
              description="Нет данных о сигналах. Проверьте подключение к серверу." 
              style={{ margin: '40px 0' }}
            />
          )}
        </>
      )}
    </div>
  );
};

// Основной компонент-обертка
const SignalTable: React.FC = () => {
  return (
    <App>
      <SignalTableContent />
    </App>
  );
};

export default SignalTable; 