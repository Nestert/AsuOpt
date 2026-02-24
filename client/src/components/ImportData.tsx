import React, { useState, useCallback } from 'react';
import { Card, Upload, Button, Select, Typography, Progress, Space, App, Steps, Result } from 'antd';
import { UploadOutlined, InboxOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { importService } from '../services/api';
import type { UploadFile } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';
import { useProject } from '../contexts/ProjectContext';
import ColumnMapper, { FieldDefinition } from './ColumnMapper';

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Option } = Select;

interface ImportDataProps {
  onImportSuccess?: (message: string) => void;
  onImportError?: (error: string) => void;
}

const requiredFieldsKip: FieldDefinition[] = [
  { key: 'posDesignation', name: 'Позиционное обозначение', required: true },
  { key: 'deviceType', name: 'Тип прибора', required: true },
  { key: 'description', name: 'Описание' },
  { key: 'unitArea', name: 'Участок' },
  { key: 'section', name: 'Секция' },
  { key: 'manufacturer', name: 'Производитель' },
  { key: 'article', name: 'Артикул' },
  { key: 'measureUnit', name: 'Ед. измерения' },
  { key: 'scale', name: 'Шкала' },
  { key: 'note', name: 'Примечание' },
  { key: 'docLink', name: 'Ссылка на документацию' },
  { key: 'responsibilityZone', name: 'Зона отв.' },
  { key: 'connectionScheme', name: 'Схема подключения' },
  { key: 'power', name: 'Питание' },
  { key: 'plc', name: 'PLC' },
  { key: 'exVersion', name: 'Ex-исполнение' },
  { key: 'environmentCharacteristics', name: 'Характеристика среды' },
  { key: 'signalPurpose', name: 'Назначение сигнала' },
  { key: 'controlPoints', name: 'Количество точек контроля' },
  { key: 'completeness', name: 'Комплектность' },
  { key: 'measuringLimits', name: 'Пределы измерений' },
];

const requiredFieldsZra: FieldDefinition[] = [
  { key: 'posDesignation', name: 'Позиция запорной арматуры', required: true },
  { key: 'valveType', name: 'Тип арматуры (Запорная/Регулирующая)', required: true },
  { key: 'designType', name: 'Конструктивное исполнение' },
  { key: 'description', name: 'Описание' },
  { key: 'unitArea', name: 'Участок' },
  { key: 'actuatorType', name: 'Тип привода' },
  { key: 'pipePosition', name: 'Позиция трубы' },
  { key: 'nominalDiameter', name: 'Условный диаметр трубы DN' },
  { key: 'pressureRating', name: 'Условное давление PN' },
  { key: 'pipeMaterial', name: 'Материал трубы' },
  { key: 'medium', name: 'Среда' },
  { key: 'positionSensor', name: 'Датчик положения' },
  { key: 'solenoidType', name: 'Тип пневмораспределителя' },
  { key: 'emergencyPosition', name: 'Положение при аварийном отключении' },
  { key: 'controlPanel', name: 'ШПУ' },
  { key: 'airConsumption', name: 'Расход воздуха' },
  { key: 'connectionSize', name: 'Ø и резьба пневмоприсоединения' },
  { key: 'fittingsCount', name: 'Кол-во ответных фитингов' },
  { key: 'tubeDiameter', name: 'Ø пневмотрубки' },
  { key: 'limitSwitchType', name: 'Тип концевого выключателя' },
  { key: 'positionerType', name: 'Тип позиционера' },
  { key: 'deviceDescription', name: 'Описание устройства' },
  { key: 'category', name: 'Категория' },
  { key: 'operation', name: 'Операция' },
  { key: 'plc', name: 'PLC' },
  { key: 'exVersion', name: 'Ex-исполнение' },
  { key: 'note', name: 'Примечание' },
];

const ImportData: React.FC<ImportDataProps> = ({ onImportSuccess, onImportError }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importType, setImportType] = useState<'kip' | 'zra'>('kip');
  const [importProgress, setImportProgress] = useState(0);

  // Состояние для маппинга
  const [tempFileName, setTempFileName] = useState<string>('');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [isMappingValid, setIsMappingValid] = useState(false);

  const { currentProjectId } = useProject();
  const { message } = App.useApp();

  const handleImportTypeChange = (value: 'kip' | 'zra') => {
    setImportType(value);
  };

  const beforeUpload = (file: RcFile) => {
    const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
    if (!isCSV) {
      message.error('Можно загружать только файлы CSV!');
    }
    return isCSV || Upload.LIST_IGNORE;
  };

  const handleChange = ({ fileList }: { fileList: UploadFile[] }) => {
    setFileList(fileList.slice(-1));
  };

  const handleAnalyze = async () => {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      message.error('Пожалуйста, выберите файл');
      return;
    }

    setUploading(true);
    try {
      const response = await importService.analyzeFile(file);
      if (response.success) {
        setTempFileName(response.tempFileName);
        setAvailableColumns(response.headers);
        setSampleData(response.sampleData);
        setCurrentStep(1); // Переход к маппингу
      } else {
        message.error('Ошибка анализа файла');
      }
    } catch (err: any) {
      console.error('Ошибка:', err);
      message.error(err.response?.data?.message || 'Не удалось проанализировать файл');
    } finally {
      setUploading(false);
    }
  };

  const handleMapChange = useCallback((map: Record<string, string>) => {
    setColumnMap(map);
    // Проверка валидности маппинга
    const requiredFields = importType === 'kip' ? requiredFieldsKip : requiredFieldsZra;
    const isValid = requiredFields
      .filter(f => f.required)
      .every(f => !!map[f.key]);
    setIsMappingValid(isValid);
  }, [importType]);

  const performImport = async () => {
    if (!isMappingValid) {
      message.error('Пожалуйста, сопоставьте все обязательные поля');
      return;
    }

    setUploading(true);
    setImportProgress(0);

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
        response = await importService.importKipFromCsv(tempFileName, columnMap, currentProjectId || undefined);
      } else {
        response = await importService.importZraFromCsv(tempFileName, columnMap, currentProjectId || undefined);
      }

      clearInterval(progressInterval);
      setImportProgress(100);

      message.success(`Данные ${importType === 'kip' ? 'КИП' : 'ЗРА'} успешно импортированы`);

      if (onImportSuccess) {
        onImportSuccess(`Успешно импортировано ${response.count || 0} записей ${importType === 'kip' ? 'КИП' : 'ЗРА'}`);
      }

      setTimeout(() => {
        setCurrentStep(2); // Переход к результату
        setUploading(false);
      }, 500);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Ошибка при импорте:', err);
      message.error('Ошибка при импорте данных');
      if (onImportError) {
        onImportError('Не удалось импортировать данные. Проверьте формат файла.');
      }
      setImportProgress(0);
      setUploading(false);
    }
  };

  const resetAll = () => {
    setFileList([]);
    setTempFileName('');
    setAvailableColumns([]);
    setSampleData([]);
    setColumnMap({});
    setCurrentStep(0);
    setImportProgress(0);
  };

  return (
    <Card className="import-data-card" styles={{ body: { padding: '24px' } }}>
      <Title level={4}>Импорт данных</Title>

      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Steps.Step title="Загрузка файла" />
        <Steps.Step title="Настройка столбцов" />
        <Steps.Step title="Завершение" />
      </Steps>

      {currentStep === 0 && (
        <div className="step-upload">
          <div className="import-type-selector" style={{ marginBottom: 16 }}>
            <Text style={{ marginRight: 8 }}>Тип импортируемых данных:</Text>
            <Select
              value={importType}
              onChange={handleImportTypeChange}
              disabled={uploading}
              style={{ width: 250 }}
            >
              <Option value="kip">КИП (Контрольно-измерительные приборы)</Option>
              <Option value="zra">ЗРА (Запорно-регулирующая арматура)</Option>
            </Select>
          </div>

          <Dragger
            fileList={fileList}
            onChange={handleChange}
            beforeUpload={beforeUpload}
            maxCount={1}
            accept=".csv"
            disabled={uploading}
            showUploadList={{ showRemoveIcon: !uploading }}
            customRequest={({ onSuccess }) => onSuccess && onSuccess("ok")}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Нажмите или перетащите файл CSV в эту область</p>
          </Dragger>

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button
              type="primary"
              onClick={handleAnalyze}
              disabled={!fileList.length || uploading}
              loading={uploading}
            >
              Далее
            </Button>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div className="step-mapping">
          <ColumnMapper
            requiredFields={importType === 'kip' ? requiredFieldsKip : requiredFieldsZra}
            availableColumns={availableColumns}
            sampleData={sampleData}
            onMapChange={handleMapChange}
          />

          {importProgress > 0 && (
            <div style={{ marginTop: 16 }}>
              <Progress percent={importProgress} status={importProgress === 100 ? 'success' : 'active'} />
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => setCurrentStep(0)}
              disabled={uploading}
            >
              Назад
            </Button>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={performImport}
              disabled={!isMappingValid || uploading}
              loading={uploading}
            >
              Импортировать
            </Button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <Result
          status="success"
          title="Импорт успешно завершен!"
          subTitle="Устройства добавлены в базу данных."
          icon={<CheckCircleOutlined />}
          extra={[
            <Button type="primary" key="console" onClick={resetAll}>
              Загрузить еще один файл
            </Button>,
          ]}
        />
      )}
    </Card>
  );
};

export default ImportData; 