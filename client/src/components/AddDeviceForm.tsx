import React, { useState } from 'react';
import { Modal, Form, Input, Button, Select, Divider, App } from 'antd';
import { deviceService } from '../services/api';
import { Kip, Zra } from '../interfaces/DeviceReference';

const { Option } = Select;

interface AddDeviceFormProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  parentId?: number | null;
  projectId?: number | null;
}

// Интерфейс для данных нового устройства
interface NewDeviceData {
  reference: {
    posDesignation: string;
    deviceType: string;
    description: string;
    parentId?: number | null;
    projectId?: number | null;
  };
  dataType: 'unknown' | 'kip' | 'zra';
  kip?: Partial<Kip>;
  zra?: Partial<Zra>;
}

const AddDeviceForm: React.FC<AddDeviceFormProps> = ({ visible, onCancel, onSuccess, parentId, projectId }) => {
  const [form] = Form.useForm();
  const [deviceType, setDeviceType] = useState<string>('unknown');
  const [loading, setLoading] = useState(false);
  
  const { message } = App.useApp();

  // Обработчик изменения типа устройства
  const handleDeviceTypeChange = (value: string) => {
    setDeviceType(value);
  };

  // Отправка формы
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // Подготовка данных устройства
      const deviceData: NewDeviceData = {
        reference: {
          posDesignation: values.posDesignation,
          deviceType: values.deviceType,
          description: values.description || '',
          ...(projectId ? { projectId } : {}),
        },
        dataType: values.deviceType as 'unknown' | 'kip' | 'zra',
      };
      
      // Добавление специфичных данных в зависимости от типа устройства
      if (values.deviceType === 'kip') {
        deviceData.kip = {
          section: values.section || '',
          manufacturer: values.manufacturer || '',
          unitArea: values.unitArea || '',
          measureUnit: values.measureUnit || '',
          scale: values.scale || '',
          // Другие поля КИП можно добавить здесь
        };
      } else if (values.deviceType === 'zra') {
        deviceData.zra = {
          unitArea: values.unitArea || '',
          designType: values.designType || '',
          valveType: values.valveType || '',
          actuatorType: values.actuatorType || '',
          nominalDiameter: values.nominalDiameter || '',
          // Другие поля ЗРА можно добавить здесь
        };
      }
      
      // Добавление parentId, если он передан
      if (parentId) {
        deviceData.reference.parentId = parentId;
      }

      // Отправка запроса на создание устройства
      await deviceService.createDevice(deviceData);
      
      message.success('Устройство успешно добавлено');
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error('Ошибка при добавлении устройства:', error);
      message.error('Не удалось добавить устройство');
    } finally {
      setLoading(false);
    }
  };

  // Рендер дополнительных полей в зависимости от типа устройства
  const renderDeviceTypeFields = () => {
    switch (deviceType) {
      case 'kip':
        return (
          <>
            <Divider orientation="left">Данные КИП</Divider>
            <Form.Item name="section" label="Участок">
              <Input placeholder="Введите участок" />
            </Form.Item>
            <Form.Item name="unitArea" label="Установка">
              <Input placeholder="Введите установку" />
            </Form.Item>
            <Form.Item name="manufacturer" label="Производитель">
              <Input placeholder="Введите производителя" />
            </Form.Item>
            <Form.Item name="measureUnit" label="Единица измерения">
              <Input placeholder="Введите единицу измерения" />
            </Form.Item>
            <Form.Item name="scale" label="Шкала">
              <Input placeholder="Введите шкалу" />
            </Form.Item>
          </>
        );
      case 'zra':
        return (
          <>
            <Divider orientation="left">Данные ЗРА</Divider>
            <Form.Item name="unitArea" label="Установка">
              <Input placeholder="Введите установку" />
            </Form.Item>
            <Form.Item name="designType" label="Тип конструкции">
              <Input placeholder="Введите тип конструкции" />
            </Form.Item>
            <Form.Item name="valveType" label="Тип клапана">
              <Input placeholder="Введите тип клапана" />
            </Form.Item>
            <Form.Item name="actuatorType" label="Тип привода">
              <Input placeholder="Введите тип привода" />
            </Form.Item>
            <Form.Item name="nominalDiameter" label="Номинальный диаметр">
              <Input placeholder="Введите номинальный диаметр" />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      open={visible}
      title="Добавление нового устройства"
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          Отмена
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          Добавить
        </Button>,
      ]}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        name="add_device_form"
        initialValues={{ deviceType: 'unknown' }}
      >
        <Divider orientation="left">Основная информация</Divider>
        <Form.Item
          name="posDesignation"
          label="Обозначение позиции"
          rules={[{ required: true, message: 'Введите обозначение позиции!' }]}
        >
          <Input placeholder="Введите обозначение позиции" />
        </Form.Item>
        
        <Form.Item
          name="deviceType"
          label="Тип устройства"
          rules={[{ required: true, message: 'Выберите тип устройства!' }]}
        >
          <Select placeholder="Выберите тип устройства" onChange={handleDeviceTypeChange}>
            <Option value="unknown">Неопределённый</Option>
            <Option value="kip">КИП (контрольно-измерительный прибор)</Option>
            <Option value="zra">ЗРА (запорно-регулирующая арматура)</Option>
          </Select>
        </Form.Item>
        
        <Form.Item name="description" label="Описание">
          <Input.TextArea rows={3} placeholder="Введите описание устройства" />
        </Form.Item>
        
        {renderDeviceTypeFields()}
      </Form>
    </Modal>
  );
};

export default AddDeviceForm; 