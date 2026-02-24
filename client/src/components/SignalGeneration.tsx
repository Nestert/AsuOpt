import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Select, Typography, Space, Spin, Table, Tag, App } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { deviceService, signalService, deviceTypeSignalService } from '../services/api';
import { DeviceReference } from '../interfaces/DeviceReference';
import { DeviceTypeSignal } from '../interfaces/DeviceTypeSignal';

const { Title, Text } = Typography;
const { Option } = Select;

interface SignalGenerationProps {
  projectId?: number | null;
}

const SignalGeneration: React.FC<SignalGenerationProps> = ({ projectId }) => {
  const { message: appMessage } = App.useApp();
  const [devices, setDevices] = useState<DeviceReference[]>([]);
  const [deviceTypeSignals, setDeviceTypeSignals] = useState<DeviceTypeSignal[]>([]);
  const [selectedController, setSelectedController] = useState<string>('Siemens');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filteredDevices, setFilteredDevices] = useState<DeviceReference[]>([]);

  // Загрузка данных
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [devicesData, typesData] = await Promise.all([
        deviceService.getAllDevices(projectId || undefined),
        deviceTypeSignalService.getAllDeviceTypeSignals()
      ]);
      setDevices(devicesData);
      setDeviceTypeSignals(typesData);
      setFilteredDevices(devicesData);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      appMessage.error('Не удалось загрузить данные устройств');
    } finally {
      setLoading(false);
    }
  }, [projectId, appMessage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Фильтр устройств по типу
  const handleDeviceTypeFilter = (deviceType: string) => {
    if (!deviceType) {
      setFilteredDevices(devices);
    } else {
      setFilteredDevices(devices.filter(d => d.deviceType === deviceType));
    }
  };

  // Генерация сигналов
  const handleGenerateSignals = async () => {
    if (filteredDevices.length === 0) {
      appMessage.warning('Нет устройств для генерации сигналов');
      return;
    }

    setGenerating(true);
    try {
      let generatedCount = 0;
      const allSignals = await signalService.getAllSignals();

      for (const device of filteredDevices) {
        // Найти конфигурацию сигналов для типа устройства
        const typeConfig = deviceTypeSignals.find(t => t.deviceType === device.deviceType);

        if (!typeConfig) {
          console.warn(`Нет конфигурации сигналов для типа ${device.deviceType}`);
          // Используем значения по умолчанию для распространенных типов
          const defaultConfig = {
            aiCount: device.deviceType.includes('Датчик') ? 1 : 0,
            aoCount: device.deviceType.includes('Клапан') || device.deviceType.includes('Затвор') ? 1 : 0,
            diCount: device.deviceType.includes('Насос') || device.deviceType.includes('Вентилятор') ? 1 : 0,
            doCount: device.deviceType.includes('Насос') || device.deviceType.includes('Вентилятор') ? 1 : 0
          };
          
          // Генерация AI сигналов
          for (let i = 0; i < defaultConfig.aiCount; i++) {
            const aiSignals = allSignals.filter(s => s.type === 'AI');
            if (aiSignals.length > 0) {
              const signal = aiSignals[i % aiSignals.length];
              try {
                await signalService.assignSignalToDevice(device.id, signal.id, 1);
                generatedCount++;
              } catch (error) {
                console.error(`Ошибка назначения AI сигнала ${signal.name} устройству ${device.id}:`, error);
              }
            }
          }
          
          // Пропускаем остальные типы сигналов для простоты
          continue;
        }

        // Генерация AI сигналов
        for (let i = 0; i < typeConfig.aiCount; i++) {
          const aiSignals = allSignals.filter(s => s.type === 'AI');
          if (aiSignals.length > 0) {
            const signal = aiSignals[i % aiSignals.length]; // Циклическое использование сигналов
            try {
              await signalService.assignSignalToDevice(device.id, signal.id, 1);
              generatedCount++;
            } catch (error) {
              console.error(`Ошибка назначения AI сигнала ${signal.name} устройству ${device.id}:`, error);
            }
          }
        }

        // Генерация AO сигналов
        for (let i = 0; i < typeConfig.aoCount; i++) {
          const aoSignals = allSignals.filter(s => s.type === 'AO');
          if (aoSignals.length > 0) {
            const signal = aoSignals[i % aoSignals.length];
            try {
              await signalService.assignSignalToDevice(device.id, signal.id, 1);
              generatedCount++;
            } catch (error) {
              console.error(`Ошибка назначения AO сигнала ${signal.name} устройству ${device.id}:`, error);
            }
          }
        }

        // Генерация DI сигналов
        for (let i = 0; i < typeConfig.diCount; i++) {
          const diSignals = allSignals.filter(s => s.type === 'DI');
          if (diSignals.length > 0) {
            const signal = diSignals[i % diSignals.length];
            try {
              await signalService.assignSignalToDevice(device.id, signal.id, 1);
              generatedCount++;
            } catch (error) {
              console.error(`Ошибка назначения DI сигнала ${signal.name} устройству ${device.id}:`, error);
            }
          }
        }

        // Генерация DO сигналов
        for (let i = 0; i < typeConfig.doCount; i++) {
          const doSignals = allSignals.filter(s => s.type === 'DO');
          if (doSignals.length > 0) {
            const signal = doSignals[i % doSignals.length];
            try {
              await signalService.assignSignalToDevice(device.id, signal.id, 1);
              generatedCount++;
            } catch (error) {
              console.error(`Ошибка назначения DO сигнала ${signal.name} устройству ${device.id}:`, error);
            }
          }
        }
      }

      appMessage.success(`Сгенерировано ${generatedCount} сигналов для ${filteredDevices.length} устройств`);
      // Перезагрузить данные
      await fetchData();
    } catch (error) {
      console.error('Ошибка генерации сигналов:', error);
      appMessage.error('Ошибка при генерации сигналов');
    } finally {
      setGenerating(false);
    }
  };

  // Получить уникальные типы устройств
  const uniqueDeviceTypes = Array.from(new Set(devices.map(d => d.deviceType)));

  // Колонки для таблицы устройств
  const columns = [
    {
      title: 'Код оборудования',
      dataIndex: 'equipmentCode',
      key: 'equipmentCode'
    },
    {
      title: 'Тип устройства',
      dataIndex: 'deviceType',
      key: 'deviceType',
      render: (type: string) => <Tag>{type}</Tag>
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    }
  ];

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Загрузка данных...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Генерация сигналов" style={{ height: '100%' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4}>Настройки генерации</Title>
          <Space>
            <div>
              <Text>Контроллер:</Text>
              <Select
                value={selectedController}
                onChange={setSelectedController}
                style={{ width: 150, marginLeft: 8 }}
                disabled={generating}
              >
                <Option value="Siemens">Siemens</Option>
                <Option value="Trei">Trei</Option>
                <Option value="Prosoft">Prosoft</Option>
              </Select>
            </div>

            <div>
              <Text>Фильтр по типу:</Text>
              <Select
                placeholder="Все типы"
                onChange={handleDeviceTypeFilter}
                style={{ width: 150, marginLeft: 8 }}
                allowClear
                disabled={generating}
              >
                {uniqueDeviceTypes.map(type => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>
            </div>
          </Space>
        </div>

        <div>
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleGenerateSignals}
              loading={generating}
              disabled={filteredDevices.length === 0}
            >
              {generating ? 'Генерация...' : 'Сгенерировать сигналы'}
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
              disabled={generating}
            >
              Обновить
            </Button>
          </Space>
        </div>

        <div>
          <Text>Найдено устройств: {filteredDevices.length}</Text>
        </div>

        <Table
          dataSource={filteredDevices}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
          loading={generating}
        />
      </Space>
    </Card>
  );
};

export default SignalGeneration;