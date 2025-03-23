import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Typography, Space, Popconfirm, Card, Row, Col, Statistic } from 'antd';
import { signalService } from '../services/api';
import { Signal, SignalSummary } from '../interfaces/Signal';
import { PlusOutlined, ExclamationCircleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const SignalDefinitions: React.FC = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [summary, setSummary] = useState<SignalSummary[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(false);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    fetchSignals();
    fetchSummary();
  }, []);

  // Получение всех сигналов
  const fetchSignals = async () => {
    try {
      setLoading(true);
      const data = await signalService.getAllSignals();
      setSignals(data);
      setLoading(false);
    } catch (error) {
      message.error('Не удалось загрузить сигналы');
      setLoading(false);
    }
  };

  // Получение сводки по сигналам
  const fetchSummary = async () => {
    try {
      const data = await signalService.getSignalsSummary();
      setSummary(data);
    } catch (error) {
      message.error('Не удалось загрузить сводку по сигналам');
    }
  };

  // Добавление нового сигнала
  const handleAddSignal = () => {
    setIsEditing(false);
    setCurrentSignal(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // Редактирование сигнала
  const handleEditSignal = (signal: Signal) => {
    setIsEditing(true);
    setCurrentSignal(signal);
    form.setFieldsValue({
      name: signal.name,
      type: signal.type,
      description: signal.description
    });
    setIsModalVisible(true);
  };

  // Обработка отправки формы
  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (isEditing && currentSignal) {
        // Обновление существующего сигнала
        await signalService.updateSignal(currentSignal.id, values);
        message.success('Сигнал успешно обновлен');
      } else {
        // Создание нового сигнала
        await signalService.createSignal(values);
        message.success('Сигнал успешно создан');
      }
      
      setIsModalVisible(false);
      fetchSignals();
      fetchSummary();
    } catch (error) {
      message.error('Произошла ошибка при сохранении сигнала');
    }
  };

  // Удаление сигнала
  const handleDeleteSignal = async (id: number) => {
    try {
      await signalService.deleteSignal(id);
      message.success('Сигнал успешно удален');
      fetchSignals();
      fetchSummary();
    } catch (error) {
      message.error('Не удалось удалить сигнал');
    }
  };

  // Колонки для таблицы сигналов
  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      filters: [
        { text: 'AI', value: 'AI' },
        { text: 'AO', value: 'AO' },
        { text: 'DI', value: 'DI' },
        { text: 'DO', value: 'DO' },
      ],
      onFilter: (value: any, record: Signal) => record.type === value,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Кол-во',
      dataIndex: 'totalCount',
      key: 'totalCount',
      sorter: (a: Signal, b: Signal) => a.totalCount - b.totalCount,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Signal) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => handleEditSignal(record)}
          />
          <Popconfirm
            title="Вы уверены, что хотите удалить этот сигнал?"
            onConfirm={() => handleDeleteSignal(record.id)}
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
        </Space>
      ),
    },
  ];

  return (
    <div className="signal-definitions">
      <Title level={2}>Справочник типов сигналов</Title>
      
      {/* Сводная статистика */}
      <Card title="Сводная статистика по типам сигналов" style={{ marginBottom: 20 }}>
        <Row gutter={16}>
          {summary.map(item => (
            <Col span={6} key={item.type}>
              <Statistic
                title={`Всего ${item.type}`}
                value={item.totalCount}
                valueStyle={{ color: 
                  item.type === 'AI' ? '#1890ff' : 
                  item.type === 'AO' ? '#52c41a' : 
                  item.type === 'DI' ? '#faad14' : 
                  '#f5222d' 
                }}
              />
            </Col>
          ))}
        </Row>
      </Card>
      
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
      
      {/* Таблица сигналов */}
      <Table 
        columns={columns} 
        dataSource={signals}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
      
      {/* Модальное окно для добавления/редактирования сигнала */}
      <Modal
        title={isEditing ? 'Редактировать сигнал' : 'Добавить новый сигнал'}
        open={isModalVisible}
        onOk={handleFormSubmit}
        onCancel={() => setIsModalVisible(false)}
        okText={isEditing ? 'Сохранить' : 'Добавить'}
        cancelText="Отмена"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название сигнала' }]}
          >
            <Input placeholder="Введите название сигнала" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="Тип"
            rules={[{ required: true, message: 'Выберите тип сигнала' }]}
          >
            <Select placeholder="Выберите тип сигнала">
              <Option value="AI">AI (Аналоговый вход)</Option>
              <Option value="AO">AO (Аналоговый выход)</Option>
              <Option value="DI">DI (Дискретный вход)</Option>
              <Option value="DO">DO (Дискретный выход)</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea placeholder="Введите описание сигнала" rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SignalDefinitions; 