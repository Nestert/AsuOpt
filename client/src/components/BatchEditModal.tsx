import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Form, Input, Button, Spin, Alert, Tabs, message } from 'antd';
import { deviceService } from '../services/api';
import { DeviceFullData } from '../interfaces/DeviceReference';

interface BatchEditModalProps {
  visible: boolean;
  deviceIds: number[];
  onClose: () => void;
  onSuccess: () => void;
}

interface FieldValue {
  value: any;
  isMixed: boolean;
}

const BatchEditModal: React.FC<BatchEditModalProps> = ({ visible, deviceIds, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [referenceFields, setReferenceFields] = useState<Record<string, FieldValue>>({});
  const [kipFields, setKipFields] = useState<Record<string, FieldValue>>({});
  const [zraFields, setZraFields] = useState<Record<string, FieldValue>>({});
  
  const [dataType, setDataType] = useState<'kip' | 'zra' | 'unknown' | 'mixed'>('mixed');
  const [hasKipData, setHasKipData] = useState(false);
  const [hasZraData, setHasZraData] = useState(false);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await deviceService.getDevicesByIds(deviceIds);
      
      // Определяем тип данных
      const kipCount = data.filter(d => d.dataType === 'kip').length;
      const zraCount = data.filter(d => d.dataType === 'zra').length;
      const unknownCount = data.filter(d => d.dataType === 'unknown').length;
      
      setHasKipData(kipCount > 0);
      setHasZraData(zraCount > 0);
      
      if (kipCount > 0 && zraCount === 0 && unknownCount === 0) {
        setDataType('kip');
      } else if (zraCount > 0 && kipCount === 0 && unknownCount === 0) {
        setDataType('zra');
      } else if (unknownCount === data.length) {
        setDataType('unknown');
      } else {
        setDataType('mixed');
      }
      
      // Анализируем поля reference
      const refFields = analyzeReferenceFields(data);
      setReferenceFields(refFields);
      
      // Анализируем поля KIP (только если все устройства KIP)
      if (kipCount === data.length && kipCount > 0) {
        setKipFields(analyzeKipFields(data));
      }
      
      // Анализируем поля ZRA (только если все устройства ZRA)
      if (zraCount === data.length && zraCount > 0) {
        setZraFields(analyzeZraFields(data));
      }
      
    } catch (err) {
      console.error('Ошибка при загрузке устройств:', err);
      setError('Не удалось загрузить данные устройств');
    } finally {
      setLoading(false);
    }
  }, [deviceIds]);

  useEffect(() => {
    if (visible && deviceIds.length > 0) {
      loadDevices();
    }
  }, [visible, deviceIds, loadDevices]);

  const analyzeReferenceFields = (devices: DeviceFullData[]): Record<string, FieldValue> => {
    const fields: Record<string, FieldValue> = {};
    const fieldNames = ['posDesignation', 'deviceType', 'description', 'parentSystem', 'systemCode', 'equipmentCode', 'lineNumber', 'cabinetName', 'plcType', 'exVersion'];
    
    fieldNames.forEach(fieldName => {
      const values = devices.map(d => (d.reference as any)[fieldName]);
      const uniqueValues = Array.from(new Set(values.map(v => v ?? '')));
      
      fields[fieldName] = {
        value: uniqueValues.length === 1 ? values[0] : null,
        isMixed: uniqueValues.length > 1
      };
    });
    
    return fields;
  };

  const analyzeKipFields = (devices: DeviceFullData[]): Record<string, FieldValue> => {
    const fields: Record<string, FieldValue> = {};
    const fieldNames = [
      'section', 'unitArea', 'manufacturer', 'article', 'measureUnit', 'scale', 'note',
      'responsibilityZone', 'connectionScheme', 'plc', 'exVersion', 'environmentCharacteristics',
      'signalPurpose', 'controlPoints', 'completeness', 'measuringLimits', 'power', 'docLink'
    ];
    
    fieldNames.forEach(fieldName => {
      const values = devices.map(d => d.kip ? (d.kip as any)[fieldName] : null);
      const uniqueValues = Array.from(new Set(values.map(v => v ?? '')));
      
      fields[fieldName] = {
        value: uniqueValues.length === 1 ? values[0] : null,
        isMixed: uniqueValues.length > 1
      };
    });
    
    return fields;
  };

  const analyzeZraFields = (devices: DeviceFullData[]): Record<string, FieldValue> => {
    const fields: Record<string, FieldValue> = {};
    const fieldNames = [
      'unitArea', 'designType', 'valveType', 'actuatorType', 'pipePosition',
      'nominalDiameter', 'pressureRating', 'pipeMaterial', 'medium',
      'positionSensor', 'solenoidType', 'emergencyPosition', 'controlPanel',
      'airConsumption', 'connectionSize', 'fittingsCount', 'tubeDiameter',
      'limitSwitchType', 'positionerType', 'deviceDescription', 'category',
      'plc', 'exVersion', 'operation', 'note'
    ];
    
    fieldNames.forEach(fieldName => {
      const values = devices.map(d => d.zra ? (d.zra as any)[fieldName] : null);
      const uniqueValues = Array.from(new Set(values.map(v => v ?? '')));
      
      fields[fieldName] = {
        value: uniqueValues.length === 1 ? values[0] : null,
        isMixed: uniqueValues.length > 1
      };
    });
    
    return fields;
  };

  const handleFieldChange = (section: 'reference' | 'kip' | 'zra', field: string, value: any) => {
    if (section === 'reference') {
      setReferenceFields(prev => ({
        ...prev,
        [field]: { value, isMixed: false }
      }));
    } else if (section === 'kip') {
      setKipFields(prev => ({
        ...prev,
        [field]: { value, isMixed: false }
      }));
    } else if (section === 'zra') {
      setZraFields(prev => ({
        ...prev,
        [field]: { value, isMixed: false }
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Формируем обновления для reference
      const referenceUpdates: Record<string, any> = {};
      Object.entries(referenceFields).forEach(([field, fieldValue]) => {
        if (fieldValue.value !== null && fieldValue.value !== '') {
          referenceUpdates[field] = fieldValue.value;
        }
      });
      
      // Формируем обновления для KIP
      const kipUpdates: Record<string, any> = {};
      if (dataType === 'kip') {
        Object.entries(kipFields).forEach(([field, fieldValue]) => {
          if (fieldValue.value !== null && fieldValue.value !== '') {
            kipUpdates[field] = fieldValue.value;
          }
        });
      }
      
      // Формируем обновления для ZRA
      const zraUpdates: Record<string, any> = {};
      if (dataType === 'zra') {
        Object.entries(zraFields).forEach(([field, fieldValue]) => {
          if (fieldValue.value !== null && fieldValue.value !== '') {
            zraUpdates[field] = fieldValue.value;
          }
        });
      }
      
      await deviceService.batchUpdateDevices(deviceIds, referenceUpdates, kipUpdates, zraUpdates);
      
      message.success(`Успешно обновлено ${deviceIds.length} устройств`);
      onSuccess();
      onClose();
      
    } catch (err) {
      console.error('Ошибка при сохранении:', err);
      message.error('Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (section: 'reference' | 'kip' | 'zra', field: string, label: string, isTextArea = false) => {
    const fields = section === 'reference' ? referenceFields : (section === 'kip' ? kipFields : zraFields);
    const fieldData = fields[field];
    
    if (!fieldData) return null;
    
    const { value, isMixed } = fieldData;
    
    if (isMixed) {
      if (isTextArea) {
        return (
          <Form.Item key={`${section}-${field}`} label={label}>
            <Input.TextArea
              placeholder="Введите новое значение"
              rows={2}
              style={{ borderColor: '#faad14' }}
              onChange={e => handleFieldChange(section, field, e.target.value)}
            />
            <div style={{ color: '#faad14', fontSize: '12px', marginTop: '4px' }}>
              ⚠️ Разные значения у выбранных устройств - будет установлено новое значение
            </div>
          </Form.Item>
        );
      }
      return (
        <Form.Item key={`${section}-${field}`} label={label}>
          <Input
            placeholder="Введите новое значение"
            style={{ borderColor: '#faad14' }}
            onChange={e => handleFieldChange(section, field, e.target.value)}
          />
          <div style={{ color: '#faad14', fontSize: '12px', marginTop: '4px' }}>
            ⚠️ Разные значения у выбранных устройств - будет установлено новое значение
          </div>
        </Form.Item>
      );
    }
    
    if (isTextArea) {
      return (
        <Form.Item key={`${section}-${field}`} label={label}>
          <Input.TextArea
            value={value || ''}
            onChange={e => handleFieldChange(section, field, e.target.value)}
            rows={2}
          />
        </Form.Item>
      );
    }
    
    return (
      <Form.Item key={`${section}-${field}`} label={label}>
        <Input
          value={value || ''}
          onChange={e => handleFieldChange(section, field, e.target.value)}
        />
      </Form.Item>
    );
  };

  const renderReferenceFields = () => {
    const fields = [
      { name: 'posDesignation', label: 'Обозначение позиции' },
      { name: 'deviceType', label: 'Тип устройства' },
      { name: 'description', label: 'Описание', isTextArea: true },
      { name: 'parentSystem', label: 'Родительская система' },
      { name: 'systemCode', label: 'Код системы' },
      { name: 'equipmentCode', label: 'Код оборудования' },
      { name: 'lineNumber', label: 'Номер линии' },
      { name: 'cabinetName', label: 'Имя шкафа' },
      { name: 'plcType', label: 'Тип ПЛК' },
      { name: 'exVersion', label: 'Ex-версия' },
    ];
    
    return (
      <>
        {fields.map(f => renderField('reference', f.name, f.label, f.isTextArea))}
      </>
    );
  };

  const renderKipFields = () => {
    if (dataType !== 'kip') {
      return (
        <Alert
          message="Редактирование полей КИП недоступно"
          description="Выбраны устройства разных типов (КИП и ЗРА). Поля КИП можно редактировать только для однотипных устройств."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      );
    }
    
    const fields = [
      { name: 'section', label: 'Секция' },
      { name: 'unitArea', label: 'Установка/Зона' },
      { name: 'manufacturer', label: 'Производитель' },
      { name: 'article', label: 'Артикул' },
      { name: 'measureUnit', label: 'Единица измерения' },
      { name: 'scale', label: 'Шкала' },
      { name: 'responsibilityZone', label: 'Зона ответственности' },
      { name: 'connectionScheme', label: 'Схема подключения' },
      { name: 'plc', label: 'ПЛК' },
      { name: 'exVersion', label: 'Ex-версия' },
      { name: 'power', label: 'Питание' },
      { name: 'environmentCharacteristics', label: 'Характеристики окружающей среды', isTextArea: true },
      { name: 'signalPurpose', label: 'Назначение сигнала' },
      { name: 'controlPoints', label: 'Контрольные точки' },
      { name: 'completeness', label: 'Комплектность' },
      { name: 'measuringLimits', label: 'Пределы измерений' },
      { name: 'note', label: 'Примечание', isTextArea: true },
      { name: 'docLink', label: 'Ссылка на документацию' },
    ];
    
    return (
      <>
        {fields.map(f => renderField('kip', f.name, f.label, f.isTextArea))}
      </>
    );
  };

  const renderZraFields = () => {
    if (dataType !== 'zra') {
      return (
        <Alert
          message="Редактирование полей ЗРА недоступно"
          description="Выбраны устройства разных типов (КИП и ЗРА). Поля ЗРА можно редактировать только для однотипных устройств."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      );
    }
    
    const fields = [
      { name: 'unitArea', label: 'Установка/Зона' },
      { name: 'designType', label: 'Тип конструкции' },
      { name: 'valveType', label: 'Тип клапана' },
      { name: 'actuatorType', label: 'Тип привода' },
      { name: 'pipePosition', label: 'Положение трубы' },
      { name: 'nominalDiameter', label: 'Номинальный диаметр' },
      { name: 'pressureRating', label: 'Номинальное давление' },
      { name: 'pipeMaterial', label: 'Материал трубы' },
      { name: 'medium', label: 'Среда' },
      { name: 'positionSensor', label: 'Датчик положения' },
      { name: 'solenoidType', label: 'Тип соленоида' },
      { name: 'emergencyPosition', label: 'Аварийное положение' },
      { name: 'controlPanel', label: 'Панель управления' },
      { name: 'airConsumption', label: 'Расход воздуха' },
      { name: 'connectionSize', label: 'Размер соединения' },
      { name: 'fittingsCount', label: 'Количество фитингов' },
      { name: 'tubeDiameter', label: 'Диаметр трубы' },
      { name: 'limitSwitchType', label: 'Тип концевого выключателя' },
      { name: 'positionerType', label: 'Тип позиционера' },
      { name: 'deviceDescription', label: 'Описание устройства', isTextArea: true },
      { name: 'category', label: 'Категория' },
      { name: 'plc', label: 'ПЛК' },
      { name: 'exVersion', label: 'Ex-версия' },
      { name: 'operation', label: 'Управление' },
      { name: 'note', label: 'Примечание', isTextArea: true },
    ];
    
    return (
      <>
        {fields.map(f => renderField('zra', f.name, f.label, f.isTextArea))}
      </>
    );
  };

  const getTitle = () => {
    const count = deviceIds.length;
    let typeInfo = '';
    
    if (dataType === 'kip') {
      typeInfo = ' (все устройства КИП)';
    } else if (dataType === 'zra') {
      typeInfo = ' (все устройства ЗРА)';
    } else if (dataType === 'mixed') {
      typeInfo = ' (устройства разных типов - доступны только общие поля)';
    }
    
    return `Редактирование ${count} устройств${typeInfo}`;
  };

  return (
    <Modal
      title={getTitle()}
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Отмена
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          loading={saving}
          onClick={handleSave}
        >
          Сохранить для всех ({deviceIds.length})
        </Button>
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Загрузка данных устройств...</div>
        </div>
      ) : error ? (
        <Alert message="Ошибка" description={error} type="error" showIcon />
      ) : (
        <Form layout="vertical">
          <Tabs
            items={[
              {
                key: 'reference',
                label: 'Основные данные',
                children: renderReferenceFields()
              },
              ...(hasKipData ? [{
                key: 'kip',
                label: 'Данные КИП',
                children: renderKipFields()
              }] : []),
              ...(hasZraData ? [{
                key: 'zra',
                label: 'Данные ЗРА',
                children: renderZraFields()
              }] : [])
            ]}
          />
        </Form>
      )}
    </Modal>
  );
};

export default BatchEditModal;
