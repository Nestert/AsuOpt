import React, { useEffect, useState } from 'react';
import { Button, Card, Descriptions, Empty, Spin, Tabs, Typography, Modal, Space, App } from 'antd';
import { deviceService, } from '../services/api';
import { DeviceFullData } from '../interfaces/DeviceReference';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface DeviceDetailsProps {
  deviceId: number | null;
  onDeviceDeleted?: () => void; // Callback для уведомления родительского компонента о удалении
  onDeviceUpdated?: () => void; // Callback для уведомления родительского компонента о обновлении
}

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ deviceId, onDeviceDeleted, onDeviceUpdated }) => {
  const [deviceData, setDeviceData] = useState<DeviceFullData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<DeviceFullData | null>(null);
  
  // Получаем modal и message из App на верхнем уровне компонента
  const { modal, message } = App.useApp();

  console.log('DeviceDetails: deviceId =', deviceId);

  // Функция для прямого удаления устройства через fetch
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
  const saveChanges = () => {
    if (!editableData || !deviceId) return;

    console.log('Начало сохранения изменений для устройства с ID=', deviceId);
    setLoading(true);
    
    const savePromises = [];
    
    // Сохраняем основные данные устройства (reference)
    if (editableData.reference && editableData.reference.id) {
      console.log('Сохранение основных данных устройства:', editableData.reference);
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const referencePromise = fetch(`${apiUrl}/device-references/${editableData.reference.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(editableData.reference)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Ошибка обновления основных данных: ${response.status}`);
        }
        console.log('Основные данные устройства успешно обновлены');
        return response.json();
      })
      .catch(error => {
        console.error('Ошибка при обновлении основных данных:', error);
        throw error;
      });
      
      savePromises.push(referencePromise);
    }
    
    // Сохраняем данные КИП, если есть
    if (editableData.dataType === 'kip' && editableData.kip && editableData.kip.id) {
      console.log('Сохранение данных КИП:', editableData.kip);
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const kipPromise = fetch(`${apiUrl}/kips/${editableData.kip.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(editableData.kip)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Ошибка обновления КИП: ${response.status}`);
        }
        console.log('КИП успешно обновлен');
        return response.json();
      })
      .catch(error => {
        console.error('Ошибка при обновлении КИП:', error);
        throw error;
      });
      
      savePromises.push(kipPromise);
    }
    
    // Сохраняем данные ЗРА, если есть
    if (editableData.dataType === 'zra' && editableData.zra && editableData.zra.id) {
      console.log('Сохранение данных ЗРА:', editableData.zra);
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const zraPromise = fetch(`${apiUrl}/zras/${editableData.zra.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(editableData.zra)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Ошибка обновления ЗРА: ${response.status}`);
        }
        console.log('ЗРА успешно обновлен');
        return response.json();
      })
      .catch(error => {
        console.error('Ошибка при обновлении ЗРА:', error);
        throw error;
      });
      
      savePromises.push(zraPromise);
    }
    
    // Обрабатываем результаты сохранения
    Promise.all(savePromises)
      .then(async () => {
        // Обновляем данные устройства
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/device-references/${deviceId}`);
            if (!response.ok) {
              throw new Error(`Ошибка получения обновленных данных: ${response.status}`);
            }
        return await response.json();
      })
      .then((updatedData) => {
        console.log('Данные устройства обновлены:', updatedData);
        setDeviceData(updatedData);
        message.success('Изменения успешно сохранены');
        setIsEditing(false);
        
        // Вызываем callback для обновления дерева, если он предоставлен
        if (onDeviceUpdated) {
          console.log('DeviceDetails: вызываем callback onDeviceUpdated для обновления дерева');
          onDeviceUpdated();
        } else {
          console.log('DeviceDetails: callback onDeviceUpdated не предоставлен');
        }
      })
      .catch((err) => {
        console.error('Ошибка при сохранении данных:', err);
        message.error(`Не удалось сохранить изменения: ${err.message || 'Неизвестная ошибка'}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Отменить редактирование
  const cancelEditing = () => {
    setIsEditing(false);
    setEditableData(null);
  };

  // Показать модальное окно подтверждения удаления
  const showDeleteConfirm = () => {
    if (!deviceData || !deviceId) {
      console.error('showDeleteConfirm: отсутствует deviceData или deviceId', { deviceData, deviceId });
      return;
    }
    
    console.log('Запрос на удаление устройства:', {
      id: deviceId,
      posDesignation: deviceData.reference.posDesignation
    });
    
    // Используем modal, полученный на верхнем уровне компонента
    modal.confirm({
      title: 'Вы действительно хотите удалить это устройство?',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>Позиционное обозначение: <strong>{deviceData.reference.posDesignation}</strong></p>
          <p>Тип устройства: <strong>{deviceData.reference.deviceType}</strong></p>
          <p>Это действие невозможно отменить.</p>
        </div>
      ),
      okText: 'Да, удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: () => {
        // Явно возвращаем Promise для предотвращения двойного вызова
        return new Promise<void>((resolve, reject) => {
          deleteDevice()
            .then(() => {
              console.log('DeviceDetails: удаление завершено успешно');
              resolve();
            })
            .catch((error) => {
              console.error('DeviceDetails: ошибка при удалении в обработчике modalOk:', error);
              reject(error);
            });
        });
      }
    });
  };

  // Реализация удаления устройства
  const deleteDevice = async () => {
    if (!deviceId) return;
    
    setLoading(true);
    try {
      console.log('DeviceDetails: НАЧИНАЕМ УДАЛЕНИЕ устройства с ID =', deviceId);
      
      // Отправляем запрос на удаление с прямым использованием fetch для диагностики
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      console.log(`DeviceDetails: отправляем DELETE запрос на ${apiUrl}/device-references/${deviceId}`);
      
      const response = await fetch(`${apiUrl}/device-references/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('DeviceDetails: получен ответ на удаление, статус:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('DeviceDetails: ошибка удаления, статус:', response.status, 'текст:', errorText);
        throw new Error(`Ошибка ${response.status}: ${errorText}`);
      }
      
      // Парсим тело ответа если есть
      let responseData;
      try {
        responseData = await response.json();
        console.log('DeviceDetails: данные ответа на удаление:', responseData);
      } catch (e) {
        console.log('DeviceDetails: ответ не содержит данных JSON');
      }
      
      message.success('Устройство успешно удалено');
      console.log('DeviceDetails: устройство успешно удалено');
      
      // Вызываем callback для обновления родительского компонента
      if (onDeviceDeleted) {
        console.log('DeviceDetails: вызываем callback onDeviceDeleted');
        onDeviceDeleted();
      } else {
        console.log('DeviceDetails: callback onDeviceDeleted не предоставлен!');
      }
      
      // Сбрасываем выбранное устройство
      setDeviceData(null);
    } catch (error) {
      console.error('DeviceDetails: ошибка при удалении устройства:', error);
      message.error(`Не удалось удалить устройство: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
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
      <Descriptions title="Общая информация" bordered column={1} size="small">
        <Descriptions.Item label="Обозначение">
          {isEditing ? (
            <input 
              type="text" 
              id="posDesignation"
              name="posDesignation"
              value={data.reference.posDesignation} 
              onChange={(e) => handleFieldChange('reference', 'posDesignation', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : data.reference.posDesignation}
        </Descriptions.Item>
        <Descriptions.Item label="Тип устройства">
          {isEditing ? (
            <input 
              type="text" 
              id="deviceType"
              name="deviceType"
              value={data.reference.deviceType} 
              onChange={(e) => handleFieldChange('reference', 'deviceType', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : data.reference.deviceType}
        </Descriptions.Item>
        {(data.reference.description || isEditing) && (
          <Descriptions.Item label="Описание">
            {isEditing ? (
              <textarea 
                id="description"
                name="description"
                value={data.reference.description || ''} 
                onChange={(e) => handleFieldChange('reference', 'description', e.target.value)}
                className="ant-input device-edit-textarea"
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
      <Descriptions title="Информация о КИП" bordered column={1} size="small">
        {(kip.section !== undefined || isEditing) && (
          <Descriptions.Item label="Секция">
            {isEditing ? (
              <input 
                type="text" 
                id="kipSection"
                name="kipSection"
                value={kip.section || ''} 
                onChange={(e) => handleFieldChange('kip', 'section', e.target.value)}
                className="ant-input device-edit-input"
              />
            ) : kip.section}
          </Descriptions.Item>
        )}
        {(kip.unitArea !== undefined || isEditing) && (
          <Descriptions.Item label="Установка/Зона">
            {isEditing ? (
              <input 
                type="text" 
                id="kipUnitArea"
                name="kipUnitArea"
                value={kip.unitArea || ''} 
                onChange={(e) => handleFieldChange('kip', 'unitArea', e.target.value)}
                className="ant-input device-edit-input"
              />
            ) : kip.unitArea}
          </Descriptions.Item>
        )}
        {(kip.manufacturer !== undefined || isEditing) && (
          <Descriptions.Item label="Производитель">
            {isEditing ? (
              <input 
                type="text" 
                id="kipManufacturer"
                name="kipManufacturer"
                value={kip.manufacturer || ''} 
                onChange={(e) => handleFieldChange('kip', 'manufacturer', e.target.value)}
                className="ant-input device-edit-input"
              />
            ) : kip.manufacturer}
          </Descriptions.Item>
        )}
        {(kip.article !== undefined || isEditing) && (
          <Descriptions.Item label="Артикул">
            {isEditing ? (
              <input 
                type="text" 
                id="kipArticle"
                name="kipArticle"
                value={kip.article || ''} 
                onChange={(e) => handleFieldChange('kip', 'article', e.target.value)}
                className="ant-input device-edit-input"
              />
            ) : kip.article}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Единица измерения">
          {isEditing ? (
            <input 
              type="text" 
              id="kipMeasureUnit"
              name="kipMeasureUnit"
              value={kip.measureUnit || ''} 
              onChange={(e) => handleFieldChange('kip', 'measureUnit', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : kip.measureUnit || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Шкала">
          {isEditing ? (
            <input 
              type="text" 
              id="kipScale"
              name="kipScale"
              value={kip.scale || ''} 
              onChange={(e) => handleFieldChange('kip', 'scale', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : kip.scale || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Примечание">
          {isEditing ? (
            <textarea 
              id="kipNote"
              name="kipNote"
              value={kip.note || ''} 
              onChange={(e) => handleFieldChange('kip', 'note', e.target.value)}
              className="ant-input device-edit-textarea"
            />
          ) : kip.note || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Зона ответственности">
          {isEditing ? (
            <input 
              type="text" 
              id="kipResponsibilityZone"
              name="kipResponsibilityZone"
              value={kip.responsibilityZone || ''} 
              onChange={(e) => handleFieldChange('kip', 'responsibilityZone', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : kip.responsibilityZone || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Схема подключения">
          {isEditing ? (
            <input 
              type="text" 
              id="kipConnectionScheme"
              name="kipConnectionScheme"
              value={kip.connectionScheme || ''} 
              onChange={(e) => handleFieldChange('kip', 'connectionScheme', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : kip.connectionScheme || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="ПЛК">
          {isEditing ? (
            <input 
              type="text" 
              id="kipPlc"
              name="kipPlc"
              value={kip.plc || ''} 
              onChange={(e) => handleFieldChange('kip', 'plc', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : kip.plc || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Ex-версия">
          {isEditing ? (
            <input 
              type="text" 
              id="kipExVersion"
              name="kipExVersion"
              value={kip.exVersion || ''} 
              onChange={(e) => handleFieldChange('kip', 'exVersion', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : kip.exVersion || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Контрольные точки">
          {isEditing ? (
            <input 
              type="number" 
              id="kipControlPoints"
              name="kipControlPoints"
              value={kip.controlPoints || 0} 
              onChange={(e) => handleFieldChange('kip', 'controlPoints', parseInt(e.target.value, 10) || 0)}
              className="ant-input device-edit-input"
            />
          ) : kip.controlPoints !== undefined ? kip.controlPoints : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Комплектность">
          {isEditing ? (
            <input 
              type="text" 
              id="kipCompleteness"
              name="kipCompleteness"
              value={kip.completeness || ''} 
              onChange={(e) => handleFieldChange('kip', 'completeness', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : kip.completeness || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Пределы измерений">
          {isEditing ? (
            <input 
              type="text" 
              id="kipMeasuringLimits"
              name="kipMeasuringLimits"
              value={kip.measuringLimits || ''} 
              onChange={(e) => handleFieldChange('kip', 'measuringLimits', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : kip.measuringLimits || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Питание">
          {isEditing ? (
            <input 
              type="text" 
              id="kipPower"
              name="kipPower"
              value={kip.power || ''} 
              onChange={(e) => handleFieldChange('kip', 'power', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : kip.power || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Ссылка на документацию">
          {isEditing ? (
            <input 
              type="text" 
              id="kipDocLink"
              name="kipDocLink"
              value={kip.docLink || ''} 
              onChange={(e) => handleFieldChange('kip', 'docLink', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : kip.docLink || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Характеристики окружающей среды">
          {isEditing ? (
            <textarea 
              id="kipEnvironmentCharacteristics"
              name="kipEnvironmentCharacteristics"
              value={kip.environmentCharacteristics || ''} 
              onChange={(e) => handleFieldChange('kip', 'environmentCharacteristics', e.target.value)}
              className="ant-input device-edit-textarea"
            />
          ) : kip.environmentCharacteristics || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Назначение сигнала">
          {isEditing ? (
            <input 
              type="text" 
              id="kipSignalPurpose"
              name="kipSignalPurpose"
              value={kip.signalPurpose || ''} 
              onChange={(e) => handleFieldChange('kip', 'signalPurpose', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : kip.signalPurpose || '—'}
        </Descriptions.Item>
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
      <Descriptions title="Информация о ЗРА" bordered column={1} size="small">
        {(zra.unitArea !== undefined || isEditing) && (
          <Descriptions.Item label="Установка/Зона">
            {isEditing ? (
              <input 
                type="text" 
                id="zraUnitArea"
                name="zraUnitArea"
                value={zra.unitArea || ''} 
                onChange={(e) => handleFieldChange('zra', 'unitArea', e.target.value)}
                className="ant-input device-edit-input"
              />
            ) : zra.unitArea}
          </Descriptions.Item>
        )}
        {(zra.designType !== undefined || isEditing) && (
          <Descriptions.Item label="Тип конструкции">
            {isEditing ? (
              <input 
                type="text" 
                id="zraDesignType"
                name="zraDesignType"
                value={zra.designType || ''} 
                onChange={(e) => handleFieldChange('zra', 'designType', e.target.value)}
                className="ant-input device-edit-input"
              />
            ) : zra.designType}
          </Descriptions.Item>
        )}
        {(zra.valveType !== undefined || isEditing) && (
          <Descriptions.Item label="Тип клапана">
            {isEditing ? (
              <input 
                type="text" 
                id="zraValveType"
                name="zraValveType"
                value={zra.valveType || ''} 
                onChange={(e) => handleFieldChange('zra', 'valveType', e.target.value)}
                className="ant-input device-edit-input"
              />
            ) : zra.valveType}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Тип привода">
          {isEditing ? (
            <input 
              type="text" 
              id="zraActuatorType"
              name="zraActuatorType"
              value={zra.actuatorType || ''}
              onChange={(e) => handleFieldChange('zra', 'actuatorType', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.actuatorType || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Положение трубы">
          {isEditing ? (
            <input 
              type="text" 
              id="zraPipePosition"
              name="zraPipePosition"
              value={zra.pipePosition || ''}
              onChange={(e) => handleFieldChange('zra', 'pipePosition', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.pipePosition || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Номинальный диаметр">
          {isEditing ? (
            <input 
              type="text" 
              id="zraNominalDiameter"
              name="zraNominalDiameter"
              value={zra.nominalDiameter || ''}
              onChange={(e) => handleFieldChange('zra', 'nominalDiameter', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.nominalDiameter || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Номинальное давление">
          {isEditing ? (
            <input 
              type="text" 
              id="zraPressureRating"
              name="zraPressureRating"
              value={zra.pressureRating || ''}
              onChange={(e) => handleFieldChange('zra', 'pressureRating', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.pressureRating || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Материал трубы">
          {isEditing ? (
            <input 
              type="text" 
              id="zraPipeMaterial"
              name="zraPipeMaterial"
              value={zra.pipeMaterial || ''}
              onChange={(e) => handleFieldChange('zra', 'pipeMaterial', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.pipeMaterial || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Среда">
          {isEditing ? (
            <input 
              type="text" 
              id="zraMedium"
              name="zraMedium"
              value={zra.medium || ''}
              onChange={(e) => handleFieldChange('zra', 'medium', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.medium || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Датчик положения">
          {isEditing ? (
            <input 
              type="text" 
              id="zraPositionSensor"
              name="zraPositionSensor"
              value={zra.positionSensor || ''}
              onChange={(e) => handleFieldChange('zra', 'positionSensor', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.positionSensor || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Тип соленоида">
          {isEditing ? (
            <input 
              type="text" 
              id="zraSolenoidType"
              name="zraSolenoidType"
              value={zra.solenoidType || ''}
              onChange={(e) => handleFieldChange('zra', 'solenoidType', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.solenoidType || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Аварийное положение">
          {isEditing ? (
            <input 
              type="text" 
              id="zraEmergencyPosition"
              name="zraEmergencyPosition"
              value={zra.emergencyPosition || ''}
              onChange={(e) => handleFieldChange('zra', 'emergencyPosition', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.emergencyPosition || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Панель управления">
          {isEditing ? (
            <input 
              type="text" 
              id="zraControlPanel"
              name="zraControlPanel"
              value={zra.controlPanel || ''}
              onChange={(e) => handleFieldChange('zra', 'controlPanel', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.controlPanel || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Расход воздуха">
          {isEditing ? (
            <input 
              type="text" 
              id="zraAirConsumption"
              name="zraAirConsumption"
              value={zra.airConsumption || ''}
              onChange={(e) => handleFieldChange('zra', 'airConsumption', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.airConsumption || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Размер соединения">
          {isEditing ? (
            <input 
              type="text" 
              id="zraConnectionSize"
              name="zraConnectionSize"
              value={zra.connectionSize || ''}
              onChange={(e) => handleFieldChange('zra', 'connectionSize', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.connectionSize || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Количество фитингов">
          {isEditing ? (
            <input 
              type="number" 
              id="zraFittingsCount"
              name="zraFittingsCount"
              value={zra.fittingsCount || 0}
              onChange={(e) => handleFieldChange('zra', 'fittingsCount', parseInt(e.target.value, 10) || 0)}
              className="ant-input device-edit-input"
            />
          ) : zra.fittingsCount !== undefined ? zra.fittingsCount : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Диаметр трубы">
          {isEditing ? (
            <input 
              type="text" 
              id="zraTubeDiameter"
              name="zraTubeDiameter"
              value={zra.tubeDiameter || ''}
              onChange={(e) => handleFieldChange('zra', 'tubeDiameter', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.tubeDiameter || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Тип концевого выключателя">
          {isEditing ? (
            <input 
              type="text" 
              id="zraLimitSwitchType"
              name="zraLimitSwitchType"
              value={zra.limitSwitchType || ''}
              onChange={(e) => handleFieldChange('zra', 'limitSwitchType', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.limitSwitchType || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Тип позиционера">
          {isEditing ? (
            <input 
              type="text" 
              id="zraPositionerType"
              name="zraPositionerType"
              value={zra.positionerType || ''}
              onChange={(e) => handleFieldChange('zra', 'positionerType', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.positionerType || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Описание устройства">
          {isEditing ? (
            <textarea 
              id="zraDeviceDescription"
              name="zraDeviceDescription"
              value={zra.deviceDescription || ''}
              onChange={(e) => handleFieldChange('zra', 'deviceDescription', e.target.value)}
              className="ant-input device-edit-textarea"
            />
          ) : zra.deviceDescription || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Категория">
          {isEditing ? (
            <input 
              type="text" 
              id="zraCategory"
              name="zraCategory"
              value={zra.category || ''}
              onChange={(e) => handleFieldChange('zra', 'category', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.category || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="ПЛК">
          {isEditing ? (
            <input 
              type="text" 
              id="zraPlc"
              name="zraPlc"
              value={zra.plc || ''}
              onChange={(e) => handleFieldChange('zra', 'plc', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.plc || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Ex-версия">
          {isEditing ? (
            <input 
              type="text" 
              id="zraExVersion"
              name="zraExVersion"
              value={zra.exVersion || ''}
              onChange={(e) => handleFieldChange('zra', 'exVersion', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.exVersion || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Управление">
          {isEditing ? (
            <input 
              type="text" 
              id="zraOperation"
              name="zraOperation"
              value={zra.operation || ''}
              onChange={(e) => handleFieldChange('zra', 'operation', e.target.value)}
              className="ant-input device-edit-input"
            />
          ) : zra.operation || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Примечание">
          {isEditing ? (
            <textarea 
              id="zraNote"
              name="zraNote"
              value={zra.note || ''}
              onChange={(e) => handleFieldChange('zra', 'note', e.target.value)}
              className="ant-input device-edit-textarea"
            />
          ) : zra.note || '—'}
        </Descriptions.Item>
      </Descriptions>
    );
  };

  // Если данных нет или идет загрузка
  if (loading) {
    return (
      <Card styles={{ body: { padding: '24px' } }}>
        <Spin tip="Загрузка данных...">
          <div style={{ padding: '50px 0' }}></div>
        </Spin>
      </Card>
    );
  }

  if (!deviceData || !deviceId) {
    return (
      <Card styles={{ body: { padding: '24px' } }}>
        <Empty description="Выберите устройство для просмотра" />
      </Card>
    );
  }

  // Заголовок карточки
  const cardTitle = (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '12px',
      paddingBottom: '8px',
      borderBottom: '1px solid #f0f0f0'
    }}>
      <span style={{ fontWeight: 500, fontSize: '16px' }}>
        {deviceData.reference.posDesignation} - {deviceData.reference.deviceType}
      </span>
      <Space size="small">
        {!isEditing ? (
          <>
            <Button
              type="primary" 
              icon={<EditOutlined />} 
              onClick={startEditing}
              size="small"
            >
              Редактировать
            </Button>
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              onClick={showDeleteConfirm}
              size="small"
            >
              Удалить
            </Button>
          </>
        ) : (
          <>
            <Button onClick={cancelEditing} size="small">Отмена</Button>
            <Button type="primary" onClick={saveChanges} size="small">Сохранить</Button>
          </>
        )}
      </Space>
    </div>
  );

  // Отображение данных устройства
  console.log('DeviceDetails: рендерим данные устройства:', deviceData);
  return (
    <Card 
      className="device-details-card" 
      styles={{ body: { padding: '12px' } }}
    >
      {deviceData ? (
        <div className="device-details-scroll-container">
          {cardTitle}
          
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
        </div>
      ) : (
        <Empty description="Данные устройства не найдены" />
      )}
    </Card>
  );
};

export default DeviceDetails; 