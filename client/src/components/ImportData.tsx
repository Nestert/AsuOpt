import React, { useState } from 'react';
import { Card, Upload, Button, Select, Typography, message, Progress, Space } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { importService } from '../services/api';
import type { UploadFile } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Option } = Select;

interface ImportDataProps {
  onImportSuccess?: (message: string) => void;
  onImportError?: (error: string) => void;
}

const ImportData: React.FC<ImportDataProps> = ({ onImportSuccess, onImportError }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importType, setImportType] = useState<'kip' | 'zra'>('kip');
  const [importProgress, setImportProgress] = useState(0);

  // Обработчик изменения типа импорта
  const handleImportTypeChange = (value: 'kip' | 'zra') => {
    setImportType(value);
  };

  // Перед загрузкой ограничиваем только CSV файлы
  const beforeUpload = (file: RcFile) => {
    const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
    if (!isCSV) {
      message.error('Можно загружать только файлы CSV!');
    }
    return isCSV || Upload.LIST_IGNORE;
  };

  // Обработчик изменения списка файлов
  const handleChange = ({ fileList }: { fileList: UploadFile[] }) => {
    setFileList(fileList.slice(-1)); // Ограничиваем до 1 файла
  };

  // Обработчик импорта файла
  const handleImport = async () => {
    const formData = new FormData();
    const file = fileList[0]?.originFileObj;

    if (!file) {
      message.error('Пожалуйста, выберите файл для импорта');
      return;
    }

    formData.append('file', file);

    setUploading(true);
    setImportProgress(0);

    // Имитация прогресса импорта
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 300);

    try {
      let response;
      if (importType === 'kip') {
        response = await importService.importKipData(formData);
      } else {
        response = await importService.importZraData(formData);
      }

      // Завершаем прогресс
      clearInterval(progressInterval);
      setImportProgress(100);
      
      message.success(`Данные ${importType === 'kip' ? 'КИП' : 'ЗРА'} успешно импортированы`);
      
      if (onImportSuccess) {
        onImportSuccess(`Успешно импортировано ${response.importedCount || 0} записей ${importType === 'kip' ? 'КИП' : 'ЗРА'}`);
      }

      // Сбрасываем состояние
      setTimeout(() => {
        setFileList([]);
        setImportProgress(0);
        setUploading(false);
      }, 2000);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Ошибка при импорте:', err);
      
      message.error('Ошибка при импорте данных');
      
      if (onImportError) {
        onImportError('Не удалось импортировать данные. Проверьте формат файла и попробуйте снова.');
      }
      
      setImportProgress(0);
      setUploading(false);
    }
  };

  return (
    <Card className="import-data-card">
      <Title level={4}>Импорт данных</Title>
      <Text>Загрузите CSV файл с данными устройств для импорта.</Text>

      <div className="import-type-selector">
        <Text>Тип импортируемых данных:</Text>
        <Select 
          defaultValue="kip" 
          onChange={handleImportTypeChange} 
          disabled={uploading}
          style={{ width: 200 }}
        >
          <Option value="kip">КИП (Контрольно-измерительные приборы)</Option>
          <Option value="zra">ЗРА (Запорно-регулирующая арматура)</Option>
        </Select>
      </div>

      <div className="upload-container">
        <Dragger
          fileList={fileList}
          onChange={handleChange}
          beforeUpload={beforeUpload}
          maxCount={1}
          accept=".csv"
          disabled={uploading}
          showUploadList={{ showRemoveIcon: !uploading }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Нажмите или перетащите файл CSV в эту область</p>
          <p className="ant-upload-hint">
            Файл должен быть в формате CSV с правильной структурой для импорта {importType === 'kip' ? 'КИП' : 'ЗРА'}
          </p>
        </Dragger>
      </div>

      {importProgress > 0 && (
        <div className="import-progress">
          <Progress percent={importProgress} status={importProgress === 100 ? 'success' : 'active'} />
        </div>
      )}

      <div className="import-actions">
        <Space>
          <Button
            type="primary"
            onClick={handleImport}
            disabled={!fileList.length || uploading}
            loading={uploading}
            icon={<UploadOutlined />}
          >
            {uploading ? 'Импорт...' : 'Импортировать'}
          </Button>
          
          <Button 
            onClick={() => setFileList([])} 
            disabled={!fileList.length || uploading}
          >
            Сбросить
          </Button>
        </Space>
      </div>
    </Card>
  );
};

export default ImportData; 