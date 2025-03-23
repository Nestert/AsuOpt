import React, { useState } from 'react';
import { Card, Button, Modal, Space, Spin, Alert, Typography, App } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, ClearOutlined } from '@ant-design/icons';
import { deviceService } from '../services/api';

const { Title, Text } = Typography;
// Не используем статический confirm
// const { confirm } = Modal;

interface DatabaseActionsProps {
  onDatabaseCleared?: () => void; // Колбэк после очистки
}

const DatabaseActions: React.FC<DatabaseActionsProps> = ({ onDatabaseCleared }) => {
  const [loading, setLoading] = useState(false);
  const [isReferencesModalVisible, setIsReferencesModalVisible] = useState(false);
  const [isDevicesModalVisible, setIsDevicesModalVisible] = useState(false);
  
  // Получаем message из App
  const { message } = App.useApp();

  // Показать модальное окно для очистки справочников
  const showClearReferencesModal = () => {
    setIsReferencesModalVisible(true);
  };

  // Показать модальное окно для очистки устройств
  const showClearDevicesModal = () => {
    setIsDevicesModalVisible(true);
  };

  // Обработчик подтверждения очистки справочников
  const handleClearReferencesConfirm = async () => {
    setIsReferencesModalVisible(false);
    message.loading({ content: 'Выполнение операции...', key: 'clearOperation' });
    
    try {
      await clearReferences();
    } catch (error) {
      console.error('Ошибка очистки справочников:', error);
    }
  };

  // Обработчик подтверждения очистки устройств
  const handleClearDevicesConfirm = async () => {
    setIsDevicesModalVisible(false);
    message.loading({ content: 'Выполнение операции...', key: 'clearOperation' });
    
    try {
      await clearDevices();
    } catch (error) {
      console.error('Ошибка очистки устройств:', error);
    }
  };

  // Закрытие модальных окон
  const handleCancel = (type: 'references' | 'devices') => {
    if (type === 'references') {
      setIsReferencesModalVisible(false);
    } else {
      setIsDevicesModalVisible(false);
    }
  };

  // Очистка справочников
  const clearReferences = async () => {
    setLoading(true);
    try {
      console.log('Начало очистки справочников...');
      const result = await deviceService.clearAllReferences();
      console.log('Результат очистки справочников:', result);
      
      // Если структура ответа соответствует ожидаемой
      const deletedCounts = result.deletedCounts || {};
      message.success({
        content: `Справочники успешно очищены. Удалено: ${
          deletedCounts.references !== undefined ?
          `${deletedCounts.references} справочников, ${deletedCounts.kip || 0} КИП, ${deletedCounts.zra || 0} ЗРА` : 
          'все записи'
        }`,
        key: 'clearOperation',
        duration: 5
      });
      
      if (onDatabaseCleared) {
        onDatabaseCleared();
      }
      return result;
    } catch (error: any) {
      console.error('Ошибка при очистке справочников:', error);
      message.error({
        content: `Не удалось очистить справочники: ${error.response?.data?.message || error.message || 'Неизвестная ошибка'}`,
        key: 'clearOperation',
        duration: 5
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Очистка устройств
  const clearDevices = async () => {
    setLoading(true);
    try {
      console.log('Начало очистки устройств...');
      const result = await deviceService.clearAllDevices();
      console.log('Результат очистки устройств:', result);
      
      message.success({
        content: `Устройства успешно очищены. Удалено: ${
          result.deletedCount !== undefined ? 
          result.deletedCount : 
          'все'
        } устройств`,
        key: 'clearOperation',
        duration: 5
      });
      
      if (onDatabaseCleared) {
        onDatabaseCleared();
      }
      return result;
    } catch (error: any) {
      console.error('Ошибка при очистке устройств:', error);
      message.error({
        content: `Не удалось очистить устройства: ${error.response?.data?.message || error.message || 'Неизвестная ошибка'}`,
        key: 'clearOperation',
        duration: 5
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card title={<Title level={4}>Управление базой данных</Title>} styles={{ body: { padding: '24px' } }}>
        {loading ? (
          <Spin tip="Выполняется операция...">
            <div style={{ padding: '50px 0' }}></div>
          </Spin>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Действия для управления данными в системе:</Text>
            
            <Card type="inner" title="Очистка данных" styles={{ body: { padding: '16px' } }}>
              <Space wrap>
                <Button 
                  type="primary" 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={showClearReferencesModal}
                >
                  Очистить справочники устройств
                </Button>
                
                <Button 
                  type="primary" 
                  danger 
                  icon={<ClearOutlined />} 
                  onClick={showClearDevicesModal}
                >
                  Очистить устройства
                </Button>
              </Space>
            </Card>
            
            <Alert
              message="Внимание!"
              description="Операции очистки баз данных необратимы. Рекомендуется делать резервную копию перед выполнением."
              type="warning"
              showIcon
            />
          </Space>
        )}
      </Card>

      {/* Модальное окно для очистки справочников */}
      <Modal
        title="Очистить все справочники устройств?"
        open={isReferencesModalVisible}
        onOk={handleClearReferencesConfirm}
        onCancel={() => handleCancel('references')}
        okText="Да, очистить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
      >
        <div>
          <p>Все справочники устройств будут удалены из базы данных.</p>
          <p>Записи КИП и ЗРА также будут удалены.</p>
          <Alert message="Это действие невозможно отменить!" type="warning" />
        </div>
      </Modal>

      {/* Модальное окно для очистки устройств */}
      <Modal
        title="Очистить все устройства?"
        open={isDevicesModalVisible}
        onOk={handleClearDevicesConfirm}
        onCancel={() => handleCancel('devices')}
        okText="Да, очистить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
      >
        <div>
          <p>Все устройства будут удалены из базы данных.</p>
          <Alert message="Это действие невозможно отменить!" type="warning" />
        </div>
      </Modal>
    </>
  );
};

export default DatabaseActions; 