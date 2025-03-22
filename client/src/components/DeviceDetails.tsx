import React, { useEffect, useState } from 'react';
import { Button, Card, Descriptions, Empty, Spin, Tabs, Typography, message } from 'antd';
import type { TabsProps } from 'antd';
import { deviceService, kipService, zraService } from '../services/api';
import { DeviceFullData } from '../interfaces/DeviceReference';
import { EditOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface DeviceDetailsProps {
  deviceId: number | null;
}

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ deviceId }) => {
  const [deviceData, setDeviceData] = useState<DeviceFullData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<DeviceFullData | null>(null);

  console.log('DeviceDetails: deviceId =', deviceId);

  useEffect(() => {
    const fetchDeviceDetails = async () => {
      console.log('fetchDeviceDetails: запрошен deviceId =', deviceId);
      
      if (!deviceId) {
        console.log('deviceId отсутствует, сброс данных');
        setDeviceData(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        console.log('Выполняем запрос к API с deviceId =', deviceId);
        const data = await deviceService.getDeviceById(deviceId);
        console.log('Получены данные устройства:', data);
        setDeviceData(data);
      } catch (err) {
        console.error('Ошибка при загрузке данных устройства:', err);
        setError('Не удалось загрузить данные устройства');
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceDetails();
  }, [deviceId]);

  // Начать редактирование устройства
  const startEditing = () => {
    if (deviceData) {
      setEditableData({...deviceData});
      setIsEditing(true);
    }
  };

  // Сохранить изменения
  const saveChanges = async () => {
    if (!editableData) return;

    setLoading(true);
    try {
      // Сохраняем изменения в зависимости от типа устройства
      if (editableData.dataType === 'kip' && editableData.kip) {
        await kipService.updateKip(editableData.kip.id, editableData.kip);
      } else if (editableData.dataType === 'zra' && editableData.zra) {
        await zraService.updateZra(editableData.zra.id, editableData.zra);
      }
      
      // Обновляем данные устройства
      const updatedData = await deviceService.getDeviceById(deviceId!);
      setDeviceData(updatedData);
      message.success('Данные устройства успешно обновлены');
      setIsEditing(false);
    } catch (err) {
      console.error('Ошибка при сохранении данных:', err);
      message.error('Не удалось сохранить изменения');
    } finally {
      setLoading(false);
    }
  };

  // Отменить редактирование
  const cancelEditing = () => {
    setIsEditing(false);
    setEditableData(null);
  };

  // Обработка изменения полей устройства
  const handleFieldChange = (section: 'reference' | 'kip' | 'zra', field: string, value: any) => {
    if (!editableData) return;
    
    setEditableData({
      ...editableData,
      [section]: {
        ...editableData[section],
        [field]: value
      }
    });
  };

  // Рендеринг информации об устройстве
  const renderDeviceInfo = (): React.ReactNode => {
    console.log('renderDeviceInfo, deviceData =', deviceData);
    if (!deviceData || !deviceData.reference) return null;
    
    const data = isEditing ? editableData : deviceData;
    if (!data) return null;

    return (
      <Descriptions title="Общая информация" bordered column={1}>
        <Descriptions.Item label="Обозначение">
          {isEditing ? (
            <input 
              type="text" 
              value={data.reference.posDesignation} 
              onChange={(e) => handleFieldChange('reference', 'posDesignation', e.target.value)}
              className="ant-input"
            />
          ) : data.reference.posDesignation}
        </Descriptions.Item>
        <Descriptions.Item label="Тип устройства">
          {isEditing ? (
            <input 
              type="text" 
              value={data.reference.deviceType} 
              onChange={(e) => handleFieldChange('reference', 'deviceType', e.target.value)}
              className="ant-input"
            />
          ) : data.reference.deviceType}
        </Descriptions.Item>
        {(data.reference.description || isEditing) && (
          <Descriptions.Item label="Описание">
            {isEditing ? (
              <input 
                type="text" 
                value={data.reference.description || ''} 
                onChange={(e) => handleFieldChange('reference', 'description', e.target.value)}
                className="ant-input"
              />
            ) : data.reference.description}
          </Descriptions.Item>
        )}
      </Descriptions>
    );
  };

  // Рендеринг информации о КИП
  const renderKipInfo = (): React.ReactNode => {
    if (!deviceData) return <Empty description="Нет данных КИП" />;
    
    const data = isEditing ? editableData : deviceData;
    if (!data || !data.kip) return <Empty description="Нет данных КИП" />;

    const kip = data.kip;
    return (
      <Descriptions title="Информация о КИП" bordered>
        {(kip.section !== undefined || isEditing) && (
          <Descriptions.Item label="Секция">
            {isEditing ? (
              <input 
                type="text" 
                value={kip.section || ''} 
                onChange={(e) => handleFieldChange('kip', 'section', e.target.value)}
                className="ant-input"
              />
            ) : kip.section}
          </Descriptions.Item>
        )}
        {(kip.unitArea !== undefined || isEditing) && (
          <Descriptions.Item label="Установка/Зона">
            {isEditing ? (
              <input 
                type="text" 
                value={kip.unitArea || ''} 
                onChange={(e) => handleFieldChange('kip', 'unitArea', e.target.value)}
                className="ant-input"
              />
            ) : kip.unitArea}
          </Descriptions.Item>
        )}
        {(kip.manufacturer !== undefined || isEditing) && (
          <Descriptions.Item label="Производитель">
            {isEditing ? (
              <input 
                type="text" 
                value={kip.manufacturer || ''} 
                onChange={(e) => handleFieldChange('kip', 'manufacturer', e.target.value)}
                className="ant-input"
              />
            ) : kip.manufacturer}
          </Descriptions.Item>
        )}
        {(kip.article !== undefined || isEditing) && (
          <Descriptions.Item label="Артикул">
            {isEditing ? (
              <input 
                type="text" 
                value={kip.article || ''} 
                onChange={(e) => handleFieldChange('kip', 'article', e.target.value)}
                className="ant-input"
              />
            ) : kip.article}
          </Descriptions.Item>
        )}
        {kip.measureUnit && <Descriptions.Item label="Единица измерения">{kip.measureUnit}</Descriptions.Item>}
        {kip.scale && <Descriptions.Item label="Шкала">{kip.scale}</Descriptions.Item>}
        {kip.note && <Descriptions.Item label="Примечание">{kip.note}</Descriptions.Item>}
        {kip.docLink && <Descriptions.Item label="Ссылка на документацию">{kip.docLink}</Descriptions.Item>}
        {kip.responsibilityZone && <Descriptions.Item label="Зона ответственности">{kip.responsibilityZone}</Descriptions.Item>}
        {kip.connectionScheme && <Descriptions.Item label="Схема подключения">{kip.connectionScheme}</Descriptions.Item>}
        {kip.power && <Descriptions.Item label="Питание">{kip.power}</Descriptions.Item>}
        {kip.plc && <Descriptions.Item label="ПЛК">{kip.plc}</Descriptions.Item>}
        {kip.exVersion && <Descriptions.Item label="Ex-версия">{kip.exVersion}</Descriptions.Item>}
        {kip.environmentCharacteristics && <Descriptions.Item label="Характеристики окружающей среды">{kip.environmentCharacteristics}</Descriptions.Item>}
        {kip.signalPurpose && <Descriptions.Item label="Назначение сигнала">{kip.signalPurpose}</Descriptions.Item>}
        {kip.controlPoints !== undefined && <Descriptions.Item label="Контрольные точки">{kip.controlPoints}</Descriptions.Item>}
        {kip.completeness && <Descriptions.Item label="Комплектность">{kip.completeness}</Descriptions.Item>}
        {kip.measuringLimits && <Descriptions.Item label="Пределы измерений">{kip.measuringLimits}</Descriptions.Item>}
      </Descriptions>
    );
  };

  // Рендеринг информации о ЗРА
  const renderZraInfo = (): React.ReactNode => {
    if (!deviceData) return <Empty description="Нет данных ЗРА" />;
    
    const data = isEditing ? editableData : deviceData;
    if (!data || !data.zra) return <Empty description="Нет данных ЗРА" />;

    const zra = data.zra;
    return (
      <Descriptions title="Информация о ЗРА" bordered>
        {(zra.unitArea !== undefined || isEditing) && (
          <Descriptions.Item label="Установка/Зона">
            {isEditing ? (
              <input 
                type="text" 
                value={zra.unitArea || ''} 
                onChange={(e) => handleFieldChange('zra', 'unitArea', e.target.value)}
                className="ant-input"
              />
            ) : zra.unitArea}
          </Descriptions.Item>
        )}
        {(zra.designType !== undefined || isEditing) && (
          <Descriptions.Item label="Тип конструкции">
            {isEditing ? (
              <input 
                type="text" 
                value={zra.designType || ''} 
                onChange={(e) => handleFieldChange('zra', 'designType', e.target.value)}
                className="ant-input"
              />
            ) : zra.designType}
          </Descriptions.Item>
        )}
        {(zra.valveType !== undefined || isEditing) && (
          <Descriptions.Item label="Тип клапана">
            {isEditing ? (
              <input 
                type="text" 
                value={zra.valveType || ''} 
                onChange={(e) => handleFieldChange('zra', 'valveType', e.target.value)}
                className="ant-input"
              />
            ) : zra.valveType}
          </Descriptions.Item>
        )}
        {zra.actuatorType && <Descriptions.Item label="Тип привода">{zra.actuatorType}</Descriptions.Item>}
        {zra.pipePosition && <Descriptions.Item label="Положение трубы">{zra.pipePosition}</Descriptions.Item>}
        {zra.nominalDiameter && <Descriptions.Item label="Номинальный диаметр">{zra.nominalDiameter}</Descriptions.Item>}
        {zra.pressureRating && <Descriptions.Item label="Номинальное давление">{zra.pressureRating}</Descriptions.Item>}
        {zra.pipeMaterial && <Descriptions.Item label="Материал трубы">{zra.pipeMaterial}</Descriptions.Item>}
        {zra.medium && <Descriptions.Item label="Среда">{zra.medium}</Descriptions.Item>}
        {zra.positionSensor && <Descriptions.Item label="Датчик положения">{zra.positionSensor}</Descriptions.Item>}
        {zra.solenoidType && <Descriptions.Item label="Тип соленоида">{zra.solenoidType}</Descriptions.Item>}
        {zra.emergencyPosition && <Descriptions.Item label="Аварийное положение">{zra.emergencyPosition}</Descriptions.Item>}
        {zra.controlPanel && <Descriptions.Item label="Панель управления">{zra.controlPanel}</Descriptions.Item>}
        {zra.airConsumption && <Descriptions.Item label="Расход воздуха">{zra.airConsumption}</Descriptions.Item>}
        {zra.connectionSize && <Descriptions.Item label="Размер соединения">{zra.connectionSize}</Descriptions.Item>}
        {zra.fittingsCount !== undefined && <Descriptions.Item label="Количество фитингов">{zra.fittingsCount}</Descriptions.Item>}
        {zra.tubeDiameter && <Descriptions.Item label="Диаметр трубы">{zra.tubeDiameter}</Descriptions.Item>}
        {zra.limitSwitchType && <Descriptions.Item label="Тип концевого выключателя">{zra.limitSwitchType}</Descriptions.Item>}
        {zra.positionerType && <Descriptions.Item label="Тип позиционера">{zra.positionerType}</Descriptions.Item>}
        {zra.deviceDescription && <Descriptions.Item label="Описание устройства">{zra.deviceDescription}</Descriptions.Item>}
        {zra.category && <Descriptions.Item label="Категория">{zra.category}</Descriptions.Item>}
        {zra.plc && <Descriptions.Item label="ПЛК">{zra.plc}</Descriptions.Item>}
        {zra.exVersion && <Descriptions.Item label="Ex-версия">{zra.exVersion}</Descriptions.Item>}
        {zra.operation && <Descriptions.Item label="Управление">{zra.operation}</Descriptions.Item>}
        {zra.note && <Descriptions.Item label="Примечание">{zra.note}</Descriptions.Item>}
      </Descriptions>
    );
  };

  // Отображение сообщения, когда устройство не выбрано
  if (!deviceId) {
    console.log('DeviceDetails: deviceId отсутствует, отображаем пустой интерфейс');
    return (
      <Card className="device-details-card">
        <Empty description="Выберите устройство для просмотра подробной информации" />
      </Card>
    );
  }

  // Отображение ошибки загрузки
  if (error) {
    console.log('DeviceDetails: отображаем ошибку:', error);
    return (
      <Card className="device-details-card">
        <div className="error-message">{error}</div>
        <Button type="primary" onClick={() => setError(null)}>
          Попробовать снова
        </Button>
      </Card>
    );
  }

  // Отображение состояния загрузки
  if (loading) {
    console.log('DeviceDetails: отображаем состояние загрузки');
    return (
      <Card className="device-details-card">
        <div className="loading-container">
          <Spin size="large" />
          <Text>Загрузка информации об устройстве...</Text>
        </div>
      </Card>
    );
  }

  // Отображение данных устройства
  console.log('DeviceDetails: рендерим данные устройства:', deviceData);
  return (
    <Card className="device-details-card">
      {deviceData ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4}>
              {deviceData.reference.posDesignation}
            </Title>
            {isEditing ? (
              <div>
                <Button type="primary" onClick={saveChanges} style={{ marginRight: 8 }}>
                  Сохранить
                </Button>
                <Button onClick={cancelEditing}>
                  Отмена
                </Button>
              </div>
            ) : (
              <Button 
                type="primary" 
                icon={<EditOutlined />} 
                onClick={startEditing}
              >
                Редактировать
              </Button>
            )}
          </div>
          
          <Tabs 
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: 'Общая информация',
                children: renderDeviceInfo()
              },
              ...(deviceData.dataType === 'kip' ? [{
                key: 'kip',
                label: 'Данные КИП',
                children: renderKipInfo()
              }] : []),
              ...(deviceData.dataType === 'zra' ? [{
                key: 'zra',
                label: 'Данные ЗРА',
                children: renderZraInfo()
              }] : [])
            ]}
          />
        </>
      ) : (
        <Empty description="Данные устройства не найдены" />
      )}
    </Card>
  );
};

export default DeviceDetails; 