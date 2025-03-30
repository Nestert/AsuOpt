import React, { useState, useEffect } from 'react';
import { Card, Form, Select, Input, Button, Space, Collapse, Row, Col, Checkbox, Tooltip, Typography } from 'antd';
import { FilterOutlined, ClearOutlined, SearchOutlined, SaveOutlined, LoadingOutlined } from '@ant-design/icons';
import { DeviceReference, Kip, Zra } from '../interfaces/DeviceReference';

const { Option } = Select;
const { Panel } = Collapse;
const { Text } = Typography;

// Интерфейс для фильтров
export interface DeviceFilters {
  deviceType?: string[];
  systemCode?: string[];
  plcType?: string[];
  exVersion?: string[];
  posDesignation?: string;
  description?: string;
  
  // КИП специфичные поля
  section?: string[];
  unitArea?: string[];
  manufacturer?: string[];
  measureUnit?: string[];
  responsibilityZone?: string[];
  connectionScheme?: string[];
  power?: string[];
  environmentCharacteristics?: string[];
  signalPurpose?: string[];
  
  // ЗРА специфичные поля
  designType?: string[];
  valveType?: string[];
  actuatorType?: string[];
  pipePosition?: string[];
  nominalDiameter?: string[];
  pressureRating?: string[];
  pipeMaterial?: string[];
  medium?: string[];
  positionSensor?: string[];
  solenoidType?: string[];
  emergencyPosition?: string[];
  
  // Фильтр по типу данных
  dataType?: ('kip' | 'zra' | 'unknown')[];
}

// Интерфейс для пресетов фильтров
interface FilterPreset {
  name: string;
  filters: DeviceFilters;
}

interface DeviceFiltersProps {
  onApplyFilters: (filters: DeviceFilters) => void;
  devices: DeviceReference[];
  loading?: boolean;
}

const DeviceFilters: React.FC<DeviceFiltersProps> = ({ onApplyFilters, devices, loading = false }) => {
  const [form] = Form.useForm();
  const [activeFilters, setActiveFilters] = useState<DeviceFilters>({});
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [availableValues, setAvailableValues] = useState<Record<string, string[]>>({});
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Используем Form.useWatch для отслеживания выбранных типов данных
  const watchedDataTypes = Form.useWatch('dataType', form);

  // Получение уникальных значений для полей при изменении списка устройств
  useEffect(() => {
    if (!devices || devices.length === 0) return;

    const values: Record<string, Set<string>> = {
      deviceType: new Set<string>(),
      systemCode: new Set<string>(),
      plcType: new Set<string>(),
      exVersion: new Set<string>(),
      section: new Set<string>(),
      unitArea: new Set<string>(),
      manufacturer: new Set<string>(),
      measureUnit: new Set<string>(),
      responsibilityZone: new Set<string>(),
      connectionScheme: new Set<string>(),
      power: new Set<string>(),
      environmentCharacteristics: new Set<string>(),
      signalPurpose: new Set<string>(),
      designType: new Set<string>(),
      valveType: new Set<string>(),
      actuatorType: new Set<string>(),
      pipePosition: new Set<string>(),
      nominalDiameter: new Set<string>(),
      pressureRating: new Set<string>(),
      pipeMaterial: new Set<string>(),
      medium: new Set<string>(),
      positionSensor: new Set<string>(),
      solenoidType: new Set<string>(),
      emergencyPosition: new Set<string>(),
    };

    // Собираем уникальные значения из всех устройств
    devices.forEach(device => {
      // Основные поля устройства
      if (device.deviceType) values.deviceType.add(device.deviceType);
      if (device.systemCode) values.systemCode.add(device.systemCode);
      if (device.plcType) values.plcType.add(device.plcType);
      if (device.exVersion) values.exVersion.add(device.exVersion);

      // Поля КИП и ЗРА
      // @ts-ignore - поля могут быть в расширенных данных
      const kip = device.kip as Kip | undefined;
      // @ts-ignore
      const zra = device.zra as Zra | undefined;

      if (kip) {
        if (kip.section) values.section.add(kip.section);
        if (kip.unitArea) values.unitArea.add(kip.unitArea);
        if (kip.manufacturer) values.manufacturer.add(kip.manufacturer);
        if (kip.measureUnit) values.measureUnit.add(kip.measureUnit);
        if (kip.responsibilityZone) values.responsibilityZone.add(kip.responsibilityZone);
        if (kip.connectionScheme) values.connectionScheme.add(kip.connectionScheme);
        if (kip.power) values.power.add(kip.power);
        if (kip.plc) values.plcType.add(kip.plc);
        if (kip.exVersion) values.exVersion.add(kip.exVersion);
        if (kip.environmentCharacteristics) values.environmentCharacteristics.add(kip.environmentCharacteristics);
        if (kip.signalPurpose) values.signalPurpose.add(kip.signalPurpose);
      }

      if (zra) {
        if (zra.unitArea) values.unitArea.add(zra.unitArea);
        if (zra.designType) values.designType.add(zra.designType);
        if (zra.valveType) values.valveType.add(zra.valveType);
        if (zra.actuatorType) values.actuatorType.add(zra.actuatorType);
        if (zra.pipePosition) values.pipePosition.add(zra.pipePosition);
        if (zra.nominalDiameter) values.nominalDiameter.add(zra.nominalDiameter);
        if (zra.pressureRating) values.pressureRating.add(zra.pressureRating);
        if (zra.pipeMaterial) values.pipeMaterial.add(zra.pipeMaterial);
        if (zra.medium) values.medium.add(zra.medium);
        if (zra.positionSensor) values.positionSensor.add(zra.positionSensor);
        if (zra.solenoidType) values.solenoidType.add(zra.solenoidType);
        if (zra.emergencyPosition) values.emergencyPosition.add(zra.emergencyPosition);
        if (zra.plc) values.plcType.add(zra.plc);
        if (zra.exVersion) values.exVersion.add(zra.exVersion);
      }
    });

    // Преобразуем Set в массивы и сортируем
    const result: Record<string, string[]> = {};
    Object.keys(values).forEach(key => {
      result[key] = Array.from(values[key]).sort();
    });

    setAvailableValues(result);
  }, [devices]);

  // Функция загрузки пресетов из localStorage
  const loadPresets = () => {
    const savedPresets = localStorage.getItem('deviceFilterPresets');
    if (savedPresets) {
      try {
        const parsedPresets = JSON.parse(savedPresets);
        setPresets(parsedPresets);
      } catch (e) {
        console.error('Не удалось загрузить пресеты фильтров:', e);
      }
    }
  };

  // Загружаем пресеты при монтировании компонента
  useEffect(() => {
    loadPresets();
  }, []);

  // Функция сохранения текущего фильтра как пресета
  const saveAsPreset = (presetName: string) => {
    const newPreset: FilterPreset = {
      name: presetName,
      filters: { ...activeFilters }
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('deviceFilterPresets', JSON.stringify(updatedPresets));
  };

  // Функция применения фильтра
  const applyFilters = (values: DeviceFilters) => {
    const cleanFilters = Object.entries(values)
      .reduce((acc, [key, value]) => {
        // Отфильтровываем пустые значения
        if (value === undefined || value === null || (Array.isArray(value) && value.length === 0) || value === '') {
          return acc;
        }
        return { ...acc, [key]: value };
      }, {});

    setActiveFilters(cleanFilters);
    onApplyFilters(cleanFilters);
  };

  // Обработчик сброса фильтров
  const resetFilters = () => {
    form.resetFields();
    setActiveFilters({});
    setSelectedPreset(null);
    onApplyFilters({});
  };

  // Обработчик выбора пресета
  const handlePresetChange = (presetName: string) => {
    const selectedPresetData = presets.find(preset => preset.name === presetName);
    if (selectedPresetData) {
      form.setFieldsValue(selectedPresetData.filters);
      setActiveFilters(selectedPresetData.filters);
      setSelectedPreset(presetName);
      onApplyFilters(selectedPresetData.filters);
    }
  };

  return (
    <Card 
      title={
        <Space>
          <FilterOutlined />
          <span>Фильтры устройств</span>
        </Space>
      }
      extra={
        <Space>
          {loading && <LoadingOutlined />}
          <Button 
            icon={<SaveOutlined />} 
            onClick={() => {
              const name = prompt('Введите название для пресета фильтра:');
              if (name) saveAsPreset(name);
            }}
            disabled={Object.keys(activeFilters).length === 0}
            size="small"
          >
            Сохранить
          </Button>
        </Space>
      }
      size="small"
      style={{ marginBottom: '16px' }}
    >
      <Form 
        form={form} 
        layout="vertical" 
        onFinish={applyFilters}
        initialValues={{ dataType: ['kip', 'zra', 'unknown'] }}
        size="small"
      >
        {presets.length > 0 && (
          <Form.Item label="Сохраненные фильтры" style={{ marginBottom: '8px' }}>
            <Select 
              placeholder="Выберите сохраненный фильтр" 
              value={selectedPreset}
              onChange={handlePresetChange}
              allowClear
              style={{ width: '100%' }}
              size="small"
            >
              {presets.map(preset => (
                <Option key={preset.name} value={preset.name}>{preset.name}</Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item label="Тип данных" name="dataType" style={{ marginBottom: '8px' }}>
          <Checkbox.Group>
            <Space>
              <Checkbox 
                value="kip" 
                onChange={e => {
                  const newValue = e.target.checked ? ['kip'] : ['zra', 'unknown'];
                  form.setFieldValue('dataType', newValue);
                }}
                defaultChecked
              >
                КИП
              </Checkbox>
              <Checkbox 
                value="zra" 
                onChange={e => {
                  const newValue = e.target.checked ? ['zra'] : ['kip', 'unknown'];
                  form.setFieldValue('dataType', newValue);
                }}
                defaultChecked
              >
                ЗРА
              </Checkbox>
              <Checkbox value="unknown">Неопределенный</Checkbox>
            </Space>
          </Checkbox.Group>
        </Form.Item>

        <Collapse defaultActiveKey={['basic']} size="small" ghost>
          <Panel header="Основные поля" key="basic">
            <Row gutter={[8, 8]}>
              <Col xs={24} sm={12}>
                <Form.Item label="Тип устройства" name="deviceType" style={{ marginBottom: '8px' }}>
                  <Select 
                    mode="multiple"
                    placeholder="Выберите типы устройств"
                    allowClear
                    style={{ width: '100%' }}
                    size="small"
                    maxTagCount={3}
                  >
                    {availableValues.deviceType?.map(value => (
                      <Option key={value} value={value}>{value}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Код системы" name="systemCode" style={{ marginBottom: '8px' }}>
                  <Select 
                    mode="multiple"
                    placeholder="Выберите коды систем"
                    allowClear
                    style={{ width: '100%' }}
                    size="small"
                    maxTagCount={3}
                  >
                    {availableValues.systemCode?.map(value => (
                      <Option key={value} value={value}>{value}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 8]}>
              <Col xs={24} sm={12}>
                <Form.Item label="Тип ПЛК" name="plcType" style={{ marginBottom: '8px' }}>
                  <Select 
                    mode="multiple"
                    placeholder="Выберите типы ПЛК"
                    allowClear
                    style={{ width: '100%' }}
                    size="small"
                    maxTagCount={3}
                  >
                    {availableValues.plcType?.map(value => (
                      <Option key={value} value={value}>{value}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Ex-версия" name="exVersion" style={{ marginBottom: '8px' }}>
                  <Select 
                    mode="multiple"
                    placeholder="Выберите Ex-версии"
                    allowClear
                    style={{ width: '100%' }}
                    size="small"
                    maxTagCount={3}
                  >
                    {availableValues.exVersion?.map(value => (
                      <Option key={value} value={value}>{value}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 8]}>
              <Col xs={24} sm={12}>
                <Form.Item label="Обозначение позиции" name="posDesignation" style={{ marginBottom: '8px' }}>
                  <Input 
                    placeholder="Введите часть обозначения позиции"
                    allowClear
                    suffix={<SearchOutlined />}
                    size="small"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Описание" name="description" style={{ marginBottom: '8px' }}>
                  <Input 
                    placeholder="Введите часть описания"
                    allowClear
                    suffix={<SearchOutlined />}
                    size="small"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Условный рендеринг для полей КИП */} 
          {watchedDataTypes && watchedDataTypes.includes('kip') && (
            <Panel header="Поля КИП" key="2">
              <Row gutter={[8, 8]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Участок" name="section" style={{ marginBottom: '8px' }}>
                    <Select 
                      mode="multiple"
                      placeholder="Выберите участки"
                      allowClear
                      style={{ width: '100%' }}
                      size="small"
                      maxTagCount={2}
                    >
                      {availableValues.section?.map(value => (
                        <Option key={value} value={value}>{value}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Площадка" name="unitArea" style={{ marginBottom: '8px' }}>
                    <Select 
                      mode="multiple"
                      placeholder="Выберите площадки"
                      allowClear
                      style={{ width: '100%' }}
                      size="small"
                      maxTagCount={2}
                    >
                      {availableValues.unitArea?.map(value => (
                        <Option key={value} value={value}>{value}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Производитель" name="manufacturer" style={{ marginBottom: '8px' }}>
                    <Select 
                      mode="multiple"
                      placeholder="Выберите производителей"
                      allowClear
                      style={{ width: '100%' }}
                      size="small"
                      maxTagCount={2}
                    >
                      {availableValues.manufacturer?.map(value => (
                        <Option key={value} value={value}>{value}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={[8, 8]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Ед. измерения" name="measureUnit" style={{ marginBottom: '8px' }}>
                    <Select 
                      mode="multiple"
                      placeholder="Выберите единицы измерения"
                      allowClear
                      style={{ width: '100%' }}
                      size="small"
                      maxTagCount={2}
                    >
                      {availableValues.measureUnit?.map(value => (
                        <Option key={value} value={value}>{value}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Зона ответственности" name="responsibilityZone" style={{ marginBottom: '8px' }}>
                    <Select 
                      mode="multiple"
                      placeholder="Выберите зоны ответственности"
                      allowClear
                      style={{ width: '100%' }}
                      size="small"
                      maxTagCount={2}
                    >
                      {availableValues.responsibilityZone?.map(value => (
                        <Option key={value} value={value}>{value}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Схема подключения" name="connectionScheme" style={{ marginBottom: '8px' }}>
                    <Select 
                      mode="multiple"
                      placeholder="Выберите схемы подключения"
                      allowClear
                      style={{ width: '100%' }}
                      size="small"
                      maxTagCount={2}
                    >
                      {availableValues.connectionScheme?.map(value => (
                        <Option key={value} value={value}>{value}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Panel>
          )}
          
          {/* Условный рендеринг для полей ЗРА */} 
          {watchedDataTypes && watchedDataTypes.includes('zra') && (
            <Panel header="Поля ЗРА" key="3">
              <Row gutter={[8, 8]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Тип конструкции" name="designType" style={{ marginBottom: '8px' }}>
                    <Select 
                      mode="multiple"
                      placeholder="Выберите типы конструкции"
                      allowClear
                      style={{ width: '100%' }}
                      size="small"
                      maxTagCount={2}
                    >
                      {availableValues.designType?.map(value => (
                        <Option key={value} value={value}>{value}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Тип клапана" name="valveType" style={{ marginBottom: '8px' }}>
                    <Select 
                      mode="multiple"
                      placeholder="Выберите типы клапанов"
                      allowClear
                      style={{ width: '100%' }}
                      size="small"
                      maxTagCount={2}
                    >
                      {availableValues.valveType?.map(value => (
                        <Option key={value} value={value}>{value}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Тип привода" name="actuatorType" style={{ marginBottom: '8px' }}>
                    <Select 
                      mode="multiple"
                      placeholder="Выберите типы приводов"
                      allowClear
                      style={{ width: '100%' }}
                      size="small"
                      maxTagCount={2}
                    >
                      {availableValues.actuatorType?.map(value => (
                        <Option key={value} value={value}>{value}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={[8, 8]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Номинальный диаметр" name="nominalDiameter" style={{ marginBottom: '8px' }}>
                    <Select 
                      mode="multiple"
                      placeholder="Выберите диаметры"
                      allowClear
                      style={{ width: '100%' }}
                      size="small"
                      maxTagCount={2}
                    >
                      {availableValues.nominalDiameter?.map(value => (
                        <Option key={value} value={value}>{value}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Материал трубопровода" name="pipeMaterial" style={{ marginBottom: '8px' }}>
                    <Select 
                      mode="multiple"
                      placeholder="Выберите материалы"
                      allowClear
                      style={{ width: '100%' }}
                      size="small"
                      maxTagCount={2}
                    >
                      {availableValues.pipeMaterial?.map(value => (
                        <Option key={value} value={value}>{value}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Среда" name="medium" style={{ marginBottom: '8px' }}>
                    <Select 
                      mode="multiple"
                      placeholder="Выберите среды"
                      allowClear
                      style={{ width: '100%' }}
                      size="small"
                      maxTagCount={2}
                    >
                      {availableValues.medium?.map(value => (
                        <Option key={value} value={value}>{value}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Panel>
          )}
        </Collapse>

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {Object.keys(activeFilters).length > 0 && (
              <Tooltip title="Активные фильтры" placement="top">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {Object.entries(activeFilters).slice(0, 3).map(([key, value]) => (
                    <Tooltip key={key} title={`${key}: ${Array.isArray(value) ? value.join(', ') : value}`}>
                      <div 
                        style={{ 
                          background: '#f0f0f0', 
                          padding: '1px 6px', 
                          borderRadius: '4px',
                          fontSize: '12px',
                          display: 'inline-block',
                          maxWidth: '100px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {key.substring(0, 5)}: {Array.isArray(value) 
                          ? `${value.length}` 
                          : value.toString().substring(0, 8) + (value.toString().length > 8 ? '...' : '')}
                      </div>
                    </Tooltip>
                  ))}
                  {Object.keys(activeFilters).length > 3 && (
                    <Tooltip 
                      title={Object.entries(activeFilters)
                        .slice(3)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                        .join('\n')}
                    >
                      <div 
                        style={{ 
                          background: '#f0f0f0', 
                          padding: '1px 6px', 
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        +{Object.keys(activeFilters).length - 3}
                      </div>
                    </Tooltip>
                  )}
                </div>
              </Tooltip>
            )}
          </div>
          <Space>
            <Button type="primary" htmlType="submit" icon={<FilterOutlined />} size="small">
              Применить
            </Button>
            <Button onClick={resetFilters} icon={<ClearOutlined />} size="small">
              Сбросить
            </Button>
          </Space>
        </div>
      </Form>
    </Card>
  );
};

export default DeviceFilters; 