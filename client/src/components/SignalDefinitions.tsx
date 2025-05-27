import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Typography, Space, Popconfirm, Card, Row, Col, Statistic, Upload } from 'antd';
import { signalService, importService } from '../services/api';
import { Signal, SignalSummary } from '../interfaces/Signal';
import { PlusOutlined, ExclamationCircleOutlined, EditOutlined, DeleteOutlined, UploadOutlined, LinkOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { RcFile } from 'antd/es/upload';

const { Title, Paragraph } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

interface SignalDefinitionsProps {
  projectId?: number | null;
}

const SignalDefinitions: React.FC<SignalDefinitionsProps> = ({ projectId }) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [summary, setSummary] = useState<SignalSummary[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>('');

  // Загрузка данных при монтировании компонента и при смене проекта
  useEffect(() => {
    fetchSignals();
    fetchSummary();
    fetchDeviceTypes();
  }, [projectId]);

  // Получение всех сигналов
  const fetchSignals = async () => {
    try {
      setLoading(true);
      const data = await signalService.getAllSignals(projectId || undefined);
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
      const data = await signalService.getSignalsSummary(projectId || undefined);
      setSummary(data);
    } catch (error) {
      message.error('Не удалось загрузить сводку по сигналам');
    }
  };

  // Получение уникальных типов устройств из сигналов
  const fetchDeviceTypes = async () => {
    try {
      // Здесь нужно реализовать API для получения типов устройств
      // Временно будем извлекать типы из категорий сигналов
      const signals = await signalService.getAllSignals();
      const uniqueCategories = signals
        .map(signal => signal.category)
        .filter((category): category is string => !!category)
        .filter((value, index, self) => self.indexOf(value) === index);
      setDeviceTypes(uniqueCategories);
    } catch (error) {
      message.error('Не удалось загрузить типы устройств');
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
      description: signal.description,
      category: signal.category,
      connectionType: signal.connectionType,
      voltage: signal.voltage
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

  // Показ модального окна импорта
  const showImportModal = () => {
    setFileList([]);
    setIsImportModalVisible(true);
  };

  // Перед загрузкой ограничиваем только CSV файлы
  const beforeUpload = (file: RcFile) => {
    const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
    if (!isCSV) {
      message.error('Можно загружать только файлы CSV!');
    }
    return isCSV || Upload.LIST_IGNORE;
  };

  // Обработчик изменения списка файлов
  const handleChange = ({ fileList }: { fileList: UploadFile[] }) => {
    setFileList(fileList.slice(-1)); // Ограничиваем до 1 файла
  };

  // Импорт сигналов из CSV
  const handleImportSignals = async () => {
    if (fileList.length === 0) {
      message.error('Пожалуйста, выберите файл для импорта');
      return;
    }

    const file = fileList[0].originFileObj;
    if (!file) {
      message.error('Не удалось получить файл');
      return;
    }

    setUploading(true);
    try {
      const result = await importService.importSignalCategoriesFromCsv(file);
      if (result.success) {
        message.success(result.message);
        setIsImportModalVisible(false);
        fetchSignals();
        fetchSummary();
        fetchDeviceTypes();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('Ошибка при импорте сигналов');
    } finally {
      setUploading(false);
    }
  };

  // Показ модального окна назначения сигналов
  const showAssignModal = () => {
    Modal.confirm({
      title: 'Назначение сигналов',
      content: 'Вы уверены, что хотите назначить сигналы всем типам устройств? Это может занять некоторое время.',
      okText: 'Да, назначить',
      cancelText: 'Отмена',
      onOk: () => handleAssignSignalsToAllTypes()
    });
  };

  // Назначение сигналов всем типам устройств
  const handleAssignSignalsToAllTypes = async () => {
    setLoading(true);
    try {
      const result = await importService.assignSignalsToAllDeviceTypes();
      if (result.success) {
        message.success(result.message);
        fetchSignals();
        fetchSummary();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('Ошибка при назначении сигналов устройствам');
    } finally {
      setLoading(false);
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
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      filters: signals
        .map(signal => signal.category)
        .filter((category): category is string => !!category)
        .filter((value, index, self) => self.indexOf(value) === index)
        .map(cat => ({ text: cat, value: cat })),
      onFilter: (value: any, record: Signal) => record.category === value,
    },
    {
      title: 'Тип подключения',
      dataIndex: 'connectionType',
      key: 'connectionType',
      filters: signals
        .map(signal => signal.connectionType)
        .filter((type): type is string => !!type)
        .filter((value, index, self) => self.indexOf(value) === index)
        .map(type => ({ text: type, value: type })),
      onFilter: (value: any, record: Signal) => record.connectionType === value,
    },
    {
      title: 'Напряжение',
      dataIndex: 'voltage',
      key: 'voltage',
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
      
      {/* Кнопки действий */}
      <div style={{ marginBottom: 16, display: 'flex', gap: '8px' }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddSignal}
        >
          Добавить сигнал
        </Button>
        <Button 
          icon={<UploadOutlined />} 
          onClick={showImportModal}
        >
          Импорт из CSV
        </Button>
        <Button 
          icon={<LinkOutlined />} 
          onClick={showAssignModal}
        >
          Назначить сигналы всем типам
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
            name="category"
            label="Категория"
          >
            <Input placeholder="Введите категорию сигнала" />
          </Form.Item>
          
          <Form.Item
            name="connectionType"
            label="Тип подключения"
          >
            <Input placeholder="Например: 2-провод, 4-провод" />
          </Form.Item>
          
          <Form.Item
            name="voltage"
            label="Напряжение"
          >
            <Input placeholder="Например: 4-20mA, 24V" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea placeholder="Введите описание сигнала" rows={4} />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Модальное окно импорта из CSV */}
      <Modal
        title="Импорт сигналов из CSV"
        open={isImportModalVisible}
        onOk={handleImportSignals}
        onCancel={() => setIsImportModalVisible(false)}
        okText="Импортировать"
        cancelText="Отмена"
        okButtonProps={{ loading: uploading }}
      >
        <Paragraph>
          Загрузите CSV файл с категориями сигналов для импорта. Файл должен содержать столбцы: Категория, Вид сигнала, Тип подключения, Напряжение, Описание сигнала.
        </Paragraph>
        
        <Dragger
          fileList={fileList}
          onChange={handleChange}
          beforeUpload={beforeUpload}
          maxCount={1}
          accept=".csv"
          disabled={uploading}
          showUploadList={{ showRemoveIcon: !uploading }}
          customRequest={({ onSuccess }) => {
            if (onSuccess) {
              setTimeout(() => {
                onSuccess("ok");
              }, 0);
            }
          }}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">Нажмите или перетащите файл CSV в эту область</p>
          <p className="ant-upload-hint">
            Поддерживаются только CSV файлы с корректной структурой
          </p>
        </Dragger>
      </Modal>
    </div>
  );
};

export default SignalDefinitions; 