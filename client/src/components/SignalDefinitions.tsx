import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Typography, Space, Popconfirm, Upload, Tooltip, Steps, Result } from 'antd';
import { signalService, importService } from '../services/api';
import { Signal } from '../interfaces/Signal';
import { PlusOutlined, ExclamationCircleOutlined, EditOutlined, DeleteOutlined, UploadOutlined, LinkOutlined, CheckCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import ColumnMapper, { FieldDefinition } from './ColumnMapper';
import type { UploadFile } from 'antd/es/upload/interface';
import { RcFile } from 'antd/es/upload';

const { Title, Paragraph } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

const requiredFieldsSignal: FieldDefinition[] = [
  { key: 'category', name: 'Категория', required: true },
  { key: 'signalType', name: 'Вид сигнала', required: true },
  { key: 'description', name: 'Описание сигнала', required: true },
  { key: 'connectionType', name: 'Тип подключения' },
  { key: 'voltage', name: 'Напряжение' },
];

interface SignalDefinitionsProps {
  projectId?: number | null;
}

const SignalDefinitions: React.FC<SignalDefinitionsProps> = ({ projectId }) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Состояние для маппинга импорта
  const [importStep, setImportStep] = useState(0);
  const [tempFileName, setTempFileName] = useState<string>('');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [isMappingValid, setIsMappingValid] = useState(false);

  // Загрузка данных при монтировании компонента и при смене проекта
  useEffect(() => {
    fetchSignals();
  }, [projectId]);

  // Получение всех сигналов (для справочника типов сигналов)
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

  // Фильтрация сигналов по поисковому запросу
  const filteredSignals = signals.filter(signal => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      signal.name.toLowerCase().includes(searchLower) ||
      signal.type.toLowerCase().includes(searchLower) ||
      (signal.category && signal.category.toLowerCase().includes(searchLower)) ||
      (signal.description && signal.description.toLowerCase().includes(searchLower)) ||
      (signal.connectionType && signal.connectionType.toLowerCase().includes(searchLower))
    );
  });

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
    } catch (error) {
      message.error('Не удалось удалить сигнал');
    }
  };

  // Показ модального окна импорта
  const showImportModal = () => {
    setFileList([]);
    setImportStep(0);
    setTempFileName('');
    setColumnMap({});
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

  // Анализ файла (Шаг 1)
  const handleAnalyze = async () => {
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
      const response = await importService.analyzeFile(file);
      if (response.success) {
        setTempFileName(response.tempFileName);
        setAvailableColumns(response.headers);
        setSampleData(response.sampleData);
        setImportStep(1);
      } else {
        message.error('Ошибка анализа файла');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Не удалось проанализировать файл');
    } finally {
      setUploading(false);
    }
  };

  const handleMapChange = useCallback((map: Record<string, string>) => {
    setColumnMap(map);
    const isValid = requiredFieldsSignal
      .filter(f => f.required)
      .every(f => !!map[f.key]);
    setIsMappingValid(isValid);
  }, []);

  // Импорт сигналов (Шаг 2)
  const handleImportSignals = async () => {
    if (!isMappingValid) {
      message.error('Пожалуйста, сопоставьте все обязательные поля');
      return;
    }

    setUploading(true);
    try {
      const result = await importService.importSignalCategoriesFromCsv(tempFileName, columnMap);
      if (result.success) {
        message.success(result.message);
        setImportStep(2);
        fetchSignals();
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
      const result = await importService.assignSignalsToAllDeviceTypes(projectId || undefined);
      if (result.success) {
        message.success(result.message);
        fetchSignals();
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
      filters: signals
        .map(signal => signal.name)
        .filter((name): name is string => !!name)
        .filter((value, index, self) => self.indexOf(value) === index)
        .slice(0, 10) // Limit to 10 most common names
        .map(name => ({ text: name, value: name })),
      onFilter: (value: any, record: Signal) => record.name === value,
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
      filters: signals
        .map(signal => signal.voltage)
        .filter((voltage): voltage is string => !!voltage)
        .filter((value, index, self) => self.indexOf(value) === index)
        .map(voltage => ({ text: voltage, value: voltage })),
      onFilter: (value: any, record: Signal) => record.voltage === value,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      filters: signals
        .map(signal => signal.description)
        .filter((desc): desc is string => !!desc)
        .filter((value, index, self) => self.indexOf(value) === index)
        .map(desc => ({ text: desc, value: desc })),
      onFilter: (value: any, record: Signal) => record.description === value,
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

      {/* Поиск */}
      <div style={{ marginBottom: 16 }}>
        <Tooltip title="Поиск сигналов по названию, типу (AI/AO/DI/DO), категории и описанию">
          <Input.Search
            placeholder="Поиск по названию, типу, категории, описанию"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </Tooltip>
      </div>

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
        dataSource={filteredSignals}
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
        title="Импорт категорий сигналов из CSV"
        open={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        footer={null}
        width={700}
      >
        <Steps current={importStep} style={{ marginBottom: 24 }}>
          <Steps.Step title="Загрузка" />
          <Steps.Step title="Настройка" />
          <Steps.Step title="Готово" />
        </Steps>

        {importStep === 0 && (
          <div>
            <Paragraph>
              Загрузите CSV файл с категориями сигналов для импорта. Файл должен содержать столбцы: Категория, Вид сигнала, Описание сигнала и опционально Тип подключения, Напряжение.
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
                if (onSuccess) setTimeout(() => onSuccess("ok"), 0);
              }}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">Нажмите или перетащите файл CSV в эту область</p>
            </Dragger>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Button
                type="primary"
                onClick={handleAnalyze}
                disabled={!fileList.length || uploading}
                loading={uploading}
              >
                Далее
              </Button>
            </div>
          </div>
        )}

        {importStep === 1 && (
          <div>
            <ColumnMapper
              requiredFields={requiredFieldsSignal}
              availableColumns={availableColumns}
              sampleData={sampleData}
              onMapChange={handleMapChange}
            />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => setImportStep(0)}
                disabled={uploading}
              >
                Назад
              </Button>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={handleImportSignals}
                disabled={!isMappingValid || uploading}
                loading={uploading}
              >
                Импортировать
              </Button>
            </div>
          </div>
        )}

        {importStep === 2 && (
          <Result
            status="success"
            title="Импорт успешно завершен!"
            subTitle="Категории сигналов добавлены в базу данных."
            icon={<CheckCircleOutlined />}
            extra={[
              <Button type="primary" key="console" onClick={() => setIsImportModalVisible(false)}>
                Закрыть
              </Button>,
              <Button key="buy" onClick={showImportModal}>Загрузить еще</Button>,
            ]}
          />
        )}
      </Modal>
    </div>
  );
};

export default SignalDefinitions; 