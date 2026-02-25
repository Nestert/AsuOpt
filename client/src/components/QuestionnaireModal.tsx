import React, { useState } from 'react';
import { Modal, Button, Select, Space, message } from 'antd';
import { FilePdfOutlined, FileWordOutlined } from '@ant-design/icons';
import { deviceService } from '../services/api';

interface QuestionnaireModalProps {
  visible: boolean;
  deviceIds: number[];
  onClose: () => void;
}

const { Option } = Select;

const QuestionnaireModal: React.FC<QuestionnaireModalProps> = ({ visible, deviceIds, onClose }) => {
  const [format, setFormat] = useState<'pdf' | 'word'>('pdf');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const devicesData = await deviceService.getDevicesByIds(deviceIds);
      
      // Преобразуем формат DeviceFullData в формат { device, kip, zra }
      const transformedDevices = devicesData.map((d: any) => ({
        device: d.reference,
        kip: d.kip,
        zra: d.zra
      }));
      
      const response = await fetch(`http://localhost:3001/api/exports/questionnaire`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          devices: transformedDevices,
          format
        })
      });

      if (!response.ok) {
        throw new Error('Не удалось сгенерировать опросный лист');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      const extension = format === 'pdf' ? 'pdf' : 'docx';
      a.download = `questionnaire_${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success(`Опросный лист сгенерирован (${format.toUpperCase()})`);
      onClose();
    } catch (error) {
      console.error('Ошибка генерации опросного листа:', error);
      message.error('Не удалось сгенерировать опросный лист');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Опросный лист для ${deviceIds.length} устройств`}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Отмена
        </Button>,
        <Button 
          key="generate" 
          type="primary" 
          loading={loading}
          icon={format === 'pdf' ? <FilePdfOutlined /> : <FileWordOutlined />}
          onClick={handleGenerate}
        >
          Сгенерировать {format.toUpperCase()}
        </Button>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <span>Формат: </span>
          <Select
            value={format}
            onChange={setFormat}
            style={{ width: 120 }}
          >
            <Option value="pdf">PDF</Option>
            <Option value="word">Word</Option>
          </Select>
        </div>
        <div style={{ color: '#666', fontSize: '14px' }}>
          Будет сгенерирован опросный лист для {deviceIds.length} выбранных устройств.
        </div>
      </Space>
    </Modal>
  );
};

export default QuestionnaireModal;
