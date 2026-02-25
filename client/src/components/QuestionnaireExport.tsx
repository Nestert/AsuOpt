import React, { useState, useCallback } from 'react';
import { Card, Button, Select, Typography, Spin, Alert, Checkbox, Space, App } from 'antd';
import { FilePdfOutlined, FileWordOutlined } from '@ant-design/icons';
import { deviceService, kipService, zraService, exportService } from '../services/api';
import { DeviceReference } from '../interfaces/DeviceReference';

const { Text } = Typography;
const { Option } = Select;

interface QuestionnaireExportProps {
  projectId?: number | null;
}

const QuestionnaireExport: React.FC<QuestionnaireExportProps> = ({ projectId }) => {
  const { message: appMessage } = App.useApp();
  const [devices, setDevices] = useState<DeviceReference[]>([]);
  const [kipData, setKipData] = useState<any[]>([]);
  const [zraData, setZraData] = useState<any[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<number[]>([]);
  const [format, setFormat] = useState<'pdf' | 'word'>('pdf');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Загрузка данных
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('QuestionnaireExport: Начинаем загрузку данных...');
      console.log('QuestionnaireExport: projectId =', projectId);
      
      const [devicesData, kipDataRes, zraDataRes] = await Promise.all([
        deviceService.getAllDevices(projectId || undefined).catch(err => {
          console.error('QuestionnaireExport: Ошибка загрузки устройств:', err);
          throw err;
        }),
        kipService.getAllKips(projectId || undefined).catch(err => {
          console.error('QuestionnaireExport: Ошибка загрузки КИП:', err);
          throw err;
        }),
        zraService.getAllZras(projectId || undefined).catch(err => {
          console.error('QuestionnaireExport: Ошибка загрузки ЗРА:', err);
          throw err;
        })
      ]);
      
      console.log('QuestionnaireExport: devicesData', devicesData.length);
      console.log('QuestionnaireExport: kipDataRes', kipDataRes.length);
      console.log('QuestionnaireExport: zraDataRes', zraDataRes.length);
      
      // Проверим структуру данных
      if (devicesData.length > 0) {
        console.log('QuestionnaireExport: Первое устройство:', {
          id: devicesData[0].id,
          equipmentCode: devicesData[0].equipmentCode,
          deviceType: devicesData[0].deviceType
        });
      }
      
      if (kipDataRes.length > 0) {
        console.log('QuestionnaireExport: Первый КИП:', {
          id: kipDataRes[0].id,
          deviceReferenceId: kipDataRes[0].deviceReferenceId
        });
      }
      
      setDevices(devicesData);
      setKipData(kipDataRes);
      setZraData(zraDataRes);
      
      console.log('QuestionnaireExport: Данные успешно загружены');
    } catch (error: any) {
      console.error('QuestionnaireExport: Ошибка загрузки данных:', error);
      console.error('QuestionnaireExport: Stack trace:', error.stack);
      appMessage.error('Не удалось загрузить данные для опросных листов');
    } finally {
      setLoading(false);
    }
  }, [projectId, appMessage]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);



  // Получить данные для устройства
  const getDeviceData = (device: DeviceReference) => {
    // Ищем КИП по deviceReferenceId
    const kipMatch = kipData.find(k => k.deviceReferenceId === device.id);
    // Ищем ЗРА по deviceReferenceId
    const zraMatch = zraData.find(z => z.deviceReferenceId === device.id);
    return { device, kip: kipMatch, zra: zraMatch };
  };

  // Генерация опросного листа
  const handleGenerateQuestionnaire = async () => {
    if (selectedDevices.length === 0) {
      appMessage.warning('Выберите хотя бы одно устройство');
      return;
    }

    setExporting(true);
    try {
      // Получить выбранные устройства с данными
      const selectedDeviceData = devices
        .filter(d => selectedDevices.includes(d.id))
        .map(getDeviceData);

      // Подготовить данные для экспорта
      const exportData = {
        devices: selectedDeviceData,
        format,
        projectId
      };

      const blob = await exportService.generateQuestionnaire(exportData);
      const url = window.URL.createObjectURL(blob);

      // Скачать файл
      const a = document.createElement('a');
      a.href = url;
      const extension = format === 'pdf' ? 'pdf' : 'docx';
      a.download = `questionnaire_${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      appMessage.success(`Опросный лист сгенерирован (${format.toUpperCase()})`);
    } catch (error) {
      console.error('Ошибка генерации опросного листа:', error);
      appMessage.error('Не удалось сгенерировать опросный лист');
    } finally {
      setExporting(false);
    }
  };

  // Выбор всех устройств
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDevices(devices.map(d => d.id));
    } else {
      setSelectedDevices([]);
    }
  };

  // Выбор устройства
  const handleDeviceSelect = (deviceId: number, checked: boolean) => {
    if (checked) {
      setSelectedDevices(prev => [...prev, deviceId]);
    } else {
      setSelectedDevices(prev => prev.filter(id => id !== deviceId));
    }
  };

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
    <Card title="Генерация опросных листов" style={{ height: '100%' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="Опросные листы"
          description="Создайте опросные листы с техническими данными устройств для закупки аналогичного оборудования."
          type="info"
          showIcon
        />

        <div>
          <Space>
            <div>
              <Text>Формат:</Text>
              <Select
                value={format}
                onChange={setFormat}
                style={{ width: 100, marginLeft: 8 }}
                disabled={exporting}
              >
                <Option value="pdf">PDF</Option>
                <Option value="word">Word</Option>
              </Select>
            </div>

            <Button
              type="primary"
              onClick={handleGenerateQuestionnaire}
              loading={exporting}
              disabled={selectedDevices.length === 0}
              icon={format === 'pdf' ? <FilePdfOutlined /> : <FileWordOutlined />}
            >
              {exporting ? 'Генерация...' : `Сгенерировать ${format.toUpperCase()}`}
            </Button>
          </Space>
        </div>

        <div>
          <div style={{ marginBottom: 8 }}>
            <Checkbox
              onChange={(e) => handleSelectAll(e.target.checked)}
              checked={selectedDevices.length === devices.length && devices.length > 0}
              indeterminate={selectedDevices.length > 0 && selectedDevices.length < devices.length}
            >
              Выбрать все ({devices.length})
            </Checkbox>
          </div>

          <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #d9d9d9', borderRadius: 6, padding: 8 }}>
            {devices.map(device => (
              <div key={device.id} style={{ marginBottom: 8 }}>
                <Checkbox
                  checked={selectedDevices.includes(device.id)}
                  onChange={(e) => handleDeviceSelect(device.id, e.target.checked)}
                >
                  <Text strong>{device.equipmentCode}</Text> - {device.deviceType}: {device.description}
                </Checkbox>
              </div>
            ))}
          </div>

          <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
            Выбрано: {selectedDevices.length} устройств
          </Text>
        </div>
      </Space>
    </Card>
  );
};

export default QuestionnaireExport;
