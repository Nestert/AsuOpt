import React, { useState } from 'react';
import { Card, Button, Checkbox, Typography, Form, Space, Spin, Divider, Alert, App } from 'antd';
import { DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { exportService } from '../services/api';

const { Title, Text, Paragraph } = Typography;

// Компонент-обертка для использования App.useApp()
const SignalExport: React.FC = () => {
  return (
    <App>
      <SignalExportContent />
    </App>
  );
};

// Основной контент компонента
const SignalExportContent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  // Доступные колонки для выбора
  const availableColumns = [
    { label: 'Название сигнала', value: 'name' },
    { label: 'Тип сигнала', value: 'type' },
    { label: 'Категория', value: 'category' },
    { label: 'Тип подключения', value: 'connectionType' },
    { label: 'Напряжение', value: 'voltage' },
    { label: 'Описание', value: 'description' },
    { label: 'Устройство', value: 'device' },
    { label: 'Тип устройства', value: 'deviceType' },
    { label: 'Количество', value: 'count' }
  ];

  // Обработчик экспорта файла
  const handleExport = async () => {
    try {
      const values = await form.validateFields();
      
      if (!values.columns || values.columns.length === 0) {
        message.error('Выберите хотя бы одну колонку для экспорта');
        return;
      }
      
      setLoading(true);
      
      // Получаем выбранные колонки и параметр include_plc
      const { columns, include_plc } = values;
      
      // Вызываем API для экспорта
      const blob = await exportService.exportSignalsToExcel(columns, include_plc);
      
      // Создаем ссылку на скачивание файла
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signals_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      message.success('Файл успешно экспортирован');
    } catch (error) {
      console.error('Ошибка при экспорте файла:', error);
      message.error('Не удалось экспортировать файл');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signal-export">
      <Card variant="borderless">
        <Title level={4}>Экспорт сигналов устройств</Title>
        <Paragraph>
          Экспортируйте все сигналы по устройствам в Excel файл.
          Вы можете выбрать колонки, которые будут включены в экспорт.
        </Paragraph>
        
        <Alert
          message="Сигналы всех устройств"
          description="Этот экспорт включает все сигналы, назначенные устройствам в системе. Вы можете выбрать необходимые для экспорта колонки."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            columns: ['name', 'type', 'device', 'deviceType', 'count'],
            include_plc: true
          }}
        >
          <Form.Item
            name="columns"
            label="Выберите колонки для экспорта:"
            rules={[{ required: true, message: 'Пожалуйста, выберите хотя бы одну колонку' }]}
          >
            <Checkbox.Group options={availableColumns} />
          </Form.Item>
          
          <Divider />
          
          <Form.Item name="include_plc" valuePropName="checked">
            <Checkbox>Включить поле ПЛК</Checkbox>
          </Form.Item>
          
          <Form.Item>
            <Button
              type="primary"
              onClick={handleExport}
              loading={loading}
              icon={<FileExcelOutlined />}
            >
              Экспортировать в Excel
            </Button>
          </Form.Item>
        </Form>
        
        {loading && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Spin />
            <div style={{ marginTop: 8 }}>Подготовка файла для экспорта...</div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SignalExport; 