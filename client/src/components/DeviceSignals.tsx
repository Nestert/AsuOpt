import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, Typography, Popconfirm, App } from 'antd';
import { signalService } from '../services/api';
import { Signal, DeviceSignal } from '../interfaces/Signal';
import { PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

interface DeviceSignalsProps {
  deviceId: number | null;
}

const DeviceSignals: React.FC<DeviceSignalsProps> = ({ deviceId }) => {
  const [deviceSignals, setDeviceSignals] = useState<DeviceSignal[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  // Оборачиваем fetchDeviceSignals в useCallback
  const fetchDeviceSignals = useCallback(async () => {
    if (!deviceId) return;
    
    try {
      setLoading(true);
      const data = await signalService.getDeviceSignals(deviceId);
      setDeviceSignals(data);
      setLoading(false);
    } catch (error) {
      message.error('Не удалось загрузить сигналы устройства');
      setLoading(false);
    }
  }, [deviceId, message]); // Указываем зависимости для useCallback

  // Загрузка данных при изменении deviceId
  useEffect(() => {
    if (deviceId) {
      fetchDeviceSignals();
    } else {
      setDeviceSignals([]);
    }
  }, [deviceId, fetchDeviceSignals]); // Оставляем fetchDeviceSignals в зависимостях useEffect

  // Загрузка всех доступных сигналов при открытии модального окна
  const handleAddSignal = async () => {
    try {
      const data = await signalService.getAllSignals();
      setSignals(data);
      form.resetFields();
      setIsModalVisible(true);
    } catch (error) {
      message.error('Не удалось загрузить список сигналов');
    }
  };

  // Обработка отправки формы
  const handleFormSubmit = async () => {
    if (!deviceId) {
      message.error('Устройство не выбрано');
      return;
    }
    
    setLoading(true);
    try {
      const values = await form.validateFields();
      
      await signalService.assignSignalToDevice(
        deviceId,
        values.signalId,
        values.count
      );
      
      message.success('Сигнал успешно назначен устройству');
      setIsModalVisible(false);
      fetchDeviceSignals();
    } catch (error: any) {
      // Более детальное отображение ошибки
      const errorMessage = error.response?.data?.error || 'Произошла ошибка при назначении сигнала устройству';
      console.error('Ошибка при назначении сигнала:', errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Удаление назначения сигнала устройству
  const handleRemoveSignal = async (signalId: number) => {
    if (!deviceId) return;
    
    try {
      await signalService.removeSignalFromDevice(deviceId, signalId);
      message.success('Сигнал успешно удален с устройства');
      fetchDeviceSignals();
    } catch (error) {
      message.error('Не удалось удалить сигнал с устройства');
    }
  };

  // Колонки для таблицы сигналов устройства
  const columns = [
    {
      title: 'Название сигнала',
      dataIndex: ['signal', 'name'],
      key: 'name',
    },
    {
      title: 'Тип',
      dataIndex: ['signal', 'type'],
      key: 'type',
      filters: [
        { text: 'AI', value: 'AI' },
        { text: 'AO', value: 'AO' },
        { text: 'DI', value: 'DI' },
        { text: 'DO', value: 'DO' },
      ],
      onFilter: (value: any, record: DeviceSignal) => record.signal?.type === value,
    },
    {
      title: 'Описание',
      dataIndex: ['signal', 'description'],
      key: 'description',
    },
    {
      title: 'Количество',
      dataIndex: 'count',
      key: 'count',
      sorter: (a: DeviceSignal, b: DeviceSignal) => a.count - b.count,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: DeviceSignal) => (
        <Popconfirm
          title="Вы уверены, что хотите удалить этот сигнал с устройства?"
          onConfirm={() => handleRemoveSignal(record.signalId)}
          okText="Да"
          cancelText="Нет"
          icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
        >
          <Button 
            icon={<DeleteOutlined />} 
            size="small" 
            danger
          />
        </Popconfirm>
      ),
    },
  ];

  // Фильтрация сигналов, которые еще не назначены устройству
  const getAvailableSignals = () => {
    return signals.filter(signal => 
      !deviceSignals.some(ds => ds.signalId === signal.id)
    );
  };

  return (
    <div className="device-signals">
      {deviceId ? (
        <>
          <Title level={4}>Сигналы устройства</Title>
          
          {/* Кнопка добавления нового сигнала */}
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddSignal}
            >
              Добавить сигнал
            </Button>
          </div>
          
          {/* Таблица сигналов устройства */}
          <Table 
            columns={columns} 
            dataSource={deviceSignals}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 5 }}
          />
          
          {/* Модальное окно для назначения сигнала */}
          <Modal
            title="Назначить сигнал устройству"
            open={isModalVisible}
            onOk={handleFormSubmit}
            onCancel={() => setIsModalVisible(false)}
            okText="Назначить"
            cancelText="Отмена"
          >
            <Form
              form={form}
              layout="vertical"
              name="signalAssignForm"
            >
              <Form.Item
                name="signalId"
                label="Сигнал"
                rules={[{ required: true, message: 'Выберите сигнал' }]}
              >
                <Select placeholder="Выберите сигнал">
                  {getAvailableSignals().map(signal => (
                    <Option key={signal.id} value={signal.id}>
                      {signal.name} ({signal.type})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                name="count"
                label="Количество"
                rules={[{ required: true, message: 'Укажите количество' }]}
                initialValue={1}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Form>
          </Modal>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Title level={5}>Выберите устройство для просмотра назначенных сигналов</Title>
        </div>
      )}
    </div>
  );
};

export default DeviceSignals; 