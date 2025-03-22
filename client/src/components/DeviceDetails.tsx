import React, { useEffect, useState } from 'react';
import { Button, Card, Descriptions, Empty, Spin, Tabs, Typography, message, Modal, Space, App } from 'antd';
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
  
  // Получаем modal из App на верхнем уровне компонента
  const { modal } = App.useApp();

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
      .then(() => {
        // Обновляем данные устройства
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
        return fetch(`${apiUrl}/device-references/${deviceId}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Ошибка получения обновленных данных: ${response.status}`);
            }
            return response.json();
          });
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

  // Если данных нет или идет загрузка
  if (loading) {
    return (
      <Card>
        <Spin tip="Загрузка данных...">
          <div style={{ padding: '50px 0' }}></div>
        </Spin>
      </Card>
    );
  }

  if (!deviceData || !deviceId) {
    return (
      <Card>
        <Empty description="Выберите устройство для просмотра" />
      </Card>
    );
  }

  // Заголовок карточки
  const cardTitle = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>
        {deviceData.reference.posDesignation} - {deviceData.reference.deviceType}
      </span>
      <Space>
        {!isEditing ? (
          <>
            <Button
              type="primary" 
              icon={<EditOutlined />} 
              onClick={startEditing}
            >
              Редактировать
            </Button>
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              onClick={showDeleteConfirm}
            >
              Удалить
            </Button>
          </>
        ) : (
          <>
            <Button onClick={cancelEditing}>Отмена</Button>
            <Button type="primary" onClick={saveChanges}>Сохранить</Button>
          </>
        )}
      </Space>
    </div>
  );

  // Отображение данных устройства
  console.log('DeviceDetails: рендерим данные устройства:', deviceData);
  return (
    <Card className="device-details-card">
      {deviceData ? (
        <>
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
        </>
      ) : (
        <Empty description="Данные устройства не найдены" />
      )}
    </Card>
  );
};

export default DeviceDetails; 