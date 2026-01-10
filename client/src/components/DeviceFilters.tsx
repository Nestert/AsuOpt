import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Select, Input, Button, Space, Collapse, Row, Col, Checkbox, Tooltip, DatePicker } from 'antd';
import { FilterOutlined, ClearOutlined, SearchOutlined, SaveOutlined, LoadingOutlined } from '@ant-design/icons';
import { DeviceReference } from '../interfaces/DeviceReference';

const { Option } = Select;
const { Panel } = Collapse;

// Переименовываем интерфейс, чтобы избежать конфликта имен
export interface DeviceFiltersInterface {
  deviceType?: string[];
  systemCode?: string[];
  plcType?: string[];
  exVersion?: string[];
  posDesignation?: string;
  description?: string;
  searchText?: string;
  createdAtStart?: string;
  createdAtEnd?: string;
  updatedAtStart?: string;
  updatedAtEnd?: string;
  
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
  filters: DeviceFiltersInterface; // Используем новое имя интерфейса
  searchText?: string;
}

interface DeviceFiltersProps {
  onApplyFilters: (filters: DeviceFiltersInterface) => void; // Используем новое имя интерфейса
  onApplySearch?: (searchText: string) => void;
  devices: DeviceReference[];
  loading?: boolean;
  currentSearchText?: string;
  projectId?: number | null;
}

const DeviceFilters: React.FC<DeviceFiltersProps> = ({ onApplyFilters, onApplySearch, devices, loading = false, currentSearchText = '', projectId }) => {
  const [form] = Form.useForm();
  const [activeFilters, setActiveFilters] = useState<DeviceFiltersInterface>({}); // Используем новое имя интерфейса
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [availableValues, setAvailableValues] = useState<Record<string, { value: string; count: number }[]>>({});
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Используем Form.useWatch для отслеживания выбранных типов данных
  const watchedDataTypes = Form.useWatch('dataType', form);

  // Получение уникальных значений с подсчетом количества для полей при изменении списка устройств
  useEffect(() => {
    if (!devices || devices.length === 0) return;

    const valueCounts: Record<string, Record<string, number>> = {
      deviceType: {},
      systemCode: {},
      plcType: {},
      exVersion: {},
      section: {},
      unitArea: {},
      manufacturer: {},
      measureUnit: {},
      responsibilityZone: {},
      connectionScheme: {},
      power: {},
      environmentCharacteristics: {},
      signalPurpose: {},
      designType: {},
      valveType: {},
      actuatorType: {},
      pipePosition: {},
      nominalDiameter: {},
      pressureRating: {},
      pipeMaterial: {},
      medium: {},
      positionSensor: {},
      solenoidType: {},
      emergencyPosition: {},
    };

    // Собираем значения и подсчитываем количество из всех устройств
    devices.forEach(device => {
      // Основные поля устройства
      if (device.deviceType) {
        valueCounts.deviceType[device.deviceType] = (valueCounts.deviceType[device.deviceType] || 0) + 1;
      }
      if (device.systemCode) {
        valueCounts.systemCode[device.systemCode] = (valueCounts.systemCode[device.systemCode] || 0) + 1;
      }
      if (device.plcType) {
        valueCounts.plcType[device.plcType] = (valueCounts.plcType[device.plcType] || 0) + 1;
      }
      if (device.exVersion) {
        valueCounts.exVersion[device.exVersion] = (valueCounts.exVersion[device.exVersion] || 0) + 1;
      }

      // Поля КИП и ЗРА
      const kip = (device as any).kip;
      const zra = (device as any).zra;

      if (kip) {
        if (kip.section) valueCounts.section[kip.section] = (valueCounts.section[kip.section] || 0) + 1;
        if (kip.unitArea) valueCounts.unitArea[kip.unitArea] = (valueCounts.unitArea[kip.unitArea] || 0) + 1;
        if (kip.manufacturer) valueCounts.manufacturer[kip.manufacturer] = (valueCounts.manufacturer[kip.manufacturer] || 0) + 1;
        if (kip.measureUnit) valueCounts.measureUnit[kip.measureUnit] = (valueCounts.measureUnit[kip.measureUnit] || 0) + 1;
        if (kip.responsibilityZone) valueCounts.responsibilityZone[kip.responsibilityZone] = (valueCounts.responsibilityZone[kip.responsibilityZone] || 0) + 1;
        if (kip.connectionScheme) valueCounts.connectionScheme[kip.connectionScheme] = (valueCounts.connectionScheme[kip.connectionScheme] || 0) + 1;
        if (kip.power) valueCounts.power[kip.power] = (valueCounts.power[kip.power] || 0) + 1;
        if (kip.plc) valueCounts.plcType[kip.plc] = (valueCounts.plcType[kip.plc] || 0) + 1;
        if (kip.exVersion) valueCounts.exVersion[kip.exVersion] = (valueCounts.exVersion[kip.exVersion] || 0) + 1;
        if (kip.environmentCharacteristics) valueCounts.environmentCharacteristics[kip.environmentCharacteristics] = (valueCounts.environmentCharacteristics[kip.environmentCharacteristics] || 0) + 1;
        if (kip.signalPurpose) valueCounts.signalPurpose[kip.signalPurpose] = (valueCounts.signalPurpose[kip.signalPurpose] || 0) + 1;
      }

      if (zra) {
        if (zra.unitArea) valueCounts.unitArea[zra.unitArea] = (valueCounts.unitArea[zra.unitArea] || 0) + 1;
        if (zra.designType) valueCounts.designType[zra.designType] = (valueCounts.designType[zra.designType] || 0) + 1;
        if (zra.valveType) valueCounts.valveType[zra.valveType] = (valueCounts.valveType[zra.valveType] || 0) + 1;
        if (zra.actuatorType) valueCounts.actuatorType[zra.actuatorType] = (valueCounts.actuatorType[zra.actuatorType] || 0) + 1;
        if (zra.pipePosition) valueCounts.pipePosition[zra.pipePosition] = (valueCounts.pipePosition[zra.pipePosition] || 0) + 1;
        if (zra.nominalDiameter) valueCounts.nominalDiameter[zra.nominalDiameter] = (valueCounts.nominalDiameter[zra.nominalDiameter] || 0) + 1;
        if (zra.pressureRating) valueCounts.pressureRating[zra.pressureRating] = (valueCounts.pressureRating[zra.pressureRating] || 0) + 1;
        if (zra.pipeMaterial) valueCounts.pipeMaterial[zra.pipeMaterial] = (valueCounts.pipeMaterial[zra.pipeMaterial] || 0) + 1;
        if (zra.medium) valueCounts.medium[zra.medium] = (valueCounts.medium[zra.medium] || 0) + 1;
        if (zra.positionSensor) valueCounts.positionSensor[zra.positionSensor] = (valueCounts.positionSensor[zra.positionSensor] || 0) + 1;
        if (zra.solenoidType) valueCounts.solenoidType[zra.solenoidType] = (valueCounts.solenoidType[zra.solenoidType] || 0) + 1;
        if (zra.emergencyPosition) valueCounts.emergencyPosition[zra.emergencyPosition] = (valueCounts.emergencyPosition[zra.emergencyPosition] || 0) + 1;
        if (zra.plc) valueCounts.plcType[zra.plc] = (valueCounts.plcType[zra.plc] || 0) + 1;
        if (zra.exVersion) valueCounts.exVersion[zra.exVersion] = (valueCounts.exVersion[zra.exVersion] || 0) + 1;
      }
    });

    // Преобразуем в массивы с сортировкой по количеству (убывающий порядок)
    const result: Record<string, { value: string; count: number }[]> = {};
    Object.keys(valueCounts).forEach(key => {
      result[key] = Object.entries(valueCounts[key])
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count); // Сортировка по количеству убыванию
    });

    setAvailableValues(result);
  }, [devices]);

  // Функция загрузки пресетов из localStorage
  const loadPresets = useCallback(() => {
    const storageKey = projectId ? `deviceFilterPresets_${projectId}` : 'deviceFilterPresets';
    const savedPresets = localStorage.getItem(storageKey);
    if (savedPresets) {
      try {
        const parsedPresets = JSON.parse(savedPresets);
        setPresets(parsedPresets);
      } catch (e) {
        console.error('Не удалось загрузить пресеты фильтров:', e);
      }
    }
  }, [projectId]);

  // Загружаем пресеты при монтировании компонента
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // Функция сохранения текущего фильтра как пресета
  const saveAsPreset = (presetName: string) => {
    const newPreset: FilterPreset = {
      name: presetName,
      filters: { ...activeFilters }, // Здесь используется activeFilters, тип которого уже обновлен
      searchText: currentSearchText
    };

    const storageKey = projectId ? `deviceFilterPresets_${projectId}` : 'deviceFilterPresets';
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem(storageKey, JSON.stringify(updatedPresets));
  };

  // Функция применения фильтра
  const applyFilters = (values: DeviceFiltersInterface) => {
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
      if (selectedPresetData.searchText && onApplySearch) {
        onApplySearch(selectedPresetData.searchText);
      }
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
                    {availableValues.deviceType?.map(item => (
                      <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
                    {availableValues.systemCode?.map(item => (
                      <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
                    {availableValues.plcType?.map(item => (
                      <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
                    {availableValues.exVersion?.map(item => (
                      <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 8]}>
              <Col xs={24} sm={12}>
                <Tooltip title="Поиск по позиционному обозначению устройства (например, часть серийного номера или кода)">
                  <Form.Item label="Обозначение позиции" name="posDesignation" style={{ marginBottom: '8px' }}>
                    <Input
                      placeholder="Введите часть обозначения позиции"
                      allowClear
                      suffix={<SearchOutlined />}
                      size="small"
                    />
                  </Form.Item>
                </Tooltip>
              </Col>
              <Col xs={24} sm={12}>
                <Tooltip title="Поиск по описанию устройства (функциональное назначение, характеристики)">
                  <Form.Item label="Описание" name="description" style={{ marginBottom: '8px' }}>
                    <Input
                      placeholder="Введите часть описания"
                      allowClear
                      suffix={<SearchOutlined />}
                      size="small"
                    />
                  </Form.Item>
                </Tooltip>
              </Col>
            </Row>
            <Row gutter={[8, 8]}>
              <Col xs={24} sm={12}>
                <Form.Item label="Дата создания с" name="createdAtStart" style={{ marginBottom: '8px' }}>
                  <DatePicker
                    placeholder="Выберите дату"
                    size="small"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Дата создания по" name="createdAtEnd" style={{ marginBottom: '8px' }}>
                  <DatePicker
                    placeholder="Выберите дату"
                    size="small"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 8]}>
              <Col xs={24} sm={12}>
                <Form.Item label="Дата изменения с" name="updatedAtStart" style={{ marginBottom: '8px' }}>
                  <DatePicker
                    placeholder="Выберите дату"
                    size="small"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Дата изменения по" name="updatedAtEnd" style={{ marginBottom: '8px' }}>
                  <DatePicker
                    placeholder="Выберите дату"
                    size="small"
                    style={{ width: '100%' }}
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
                      {availableValues.section?.map(item => (
                        <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
                      {availableValues.unitArea?.map(item => (
                        <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
                      {availableValues.manufacturer?.map(item => (
                        <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
                      {availableValues.measureUnit?.map(item => (
                        <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
                      {availableValues.responsibilityZone?.map(item => (
                        <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
                      {availableValues.connectionScheme?.map(item => (
                        <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
                      {availableValues.designType?.map(item => (
                        <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
                      {availableValues.valveType?.map(item => (
                        <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
                      {availableValues.actuatorType?.map(item => (
                        <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
                      {availableValues.nominalDiameter?.map(item => (
                        <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
                      {availableValues.pipeMaterial?.map(item => (
                        <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
                      {availableValues.medium?.map(item => (
                        <Option key={item.value} value={item.value}>{item.value} ({item.count})</Option>
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
            <Tooltip title="Применить выбранные фильтры к списку устройств">
              <Button type="primary" htmlType="submit" icon={<FilterOutlined />} size="small">
                Применить
              </Button>
            </Tooltip>
            <Tooltip title="Сбросить все фильтры и показать все устройства">
              <Button onClick={resetFilters} icon={<ClearOutlined />} size="small">
                Сбросить
              </Button>
            </Tooltip>
          </Space>
        </div>
      </Form>
    </Card>
  );
};

export default DeviceFilters; 