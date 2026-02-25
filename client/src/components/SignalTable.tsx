import React, { useEffect, useState, useCallback } from 'react';
import { Table, Card, Button, Typography, Row, Col, Statistic, Spin, Alert, Empty, App, Space } from 'antd';
import { deviceTypeSignalService } from '../services/api';
import { DeviceTypeSignal, SignalsSummary } from '../interfaces/DeviceTypeSignal';
import { ReloadOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface SignalTableProps {
  projectId?: number | null;
}

// Создаем внутренний компонент, использующий App.useApp()
const SignalTableContent: React.FC<SignalTableProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SignalsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных при монтировании компонента
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Загружаем сводную таблицу существующих записей
      const summaryData = await deviceTypeSignalService.getSignalsSummary(projectId || undefined);
      setSummaryData(summaryData);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      setError('Не удалось загрузить данные. Проверьте соединение с сервером.');
      setLoading(false);
    }
  }, [projectId]);

  // Загрузка данных
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Отображение кнопок управления
  const renderActionButtons = () => {
    return (
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
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
        const total = (record.aiCount || 0) + (record.aoCount || 0) + (record.diCount || 0) + (record.doCount || 0);
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
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            Загрузка данных...
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
const SignalTable: React.FC<SignalTableProps> = ({ projectId }) => {
  return (
    <App>
      <SignalTableContent projectId={projectId} />
    </App>
  );
};

export default SignalTable;
