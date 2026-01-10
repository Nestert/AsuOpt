import React, { useState } from 'react';
import { Card, Button, Checkbox, Typography, Form, Spin, Divider, Alert, App } from 'antd';
import { FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { exportService } from '../services/api';

const { Title, Paragraph } = Typography;

interface SignalExportProps {
  projectId?: number | null;
}

// Компонент-обертка для использования App.useApp()
const SignalExport: React.FC<SignalExportProps> = ({ projectId }) => {
  return (
    <App>
      <SignalExportContent projectId={projectId} />
    </App>
  );
};

// Основной контент компонента
const SignalExportContent: React.FC<SignalExportProps> = ({ projectId }) => {
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

  // Обработчик экспорта в Excel
  const handleExportExcel = async () => {
    try {
      const values = await form.validateFields();

      if (!values.columns || values.columns.length === 0) {
        message.error('Выберите хотя бы одну колонку для экспорта');
        return;
      }

      setLoading(true);

      const { columns, include_plc } = values;
      const blob = await exportService.exportSignalsToExcel(columns, include_plc);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signals_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success('Файл успешно экспортирован в Excel');
    } catch (error) {
      console.error('Ошибка при экспорте файла:', error);
      message.error('Не удалось экспортировать файл');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик экспорта в PDF
  const handleExportPdf = async () => {
    try {
      const values = await form.validateFields();

      if (!values.columns || values.columns.length === 0) {
        message.error('Выберите хотя бы одну колонку для экспорта');
        return;
      }

      setLoading(true);

      const { columns, include_plc } = values;
      const blob = await exportService.exportSignalsToPdf(columns, include_plc);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signals_export_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success('Файл успешно экспортирован в PDF');
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
               onClick={handleExportExcel}
               loading={loading}
               icon={<FileExcelOutlined />}
               style={{ marginRight: 8 }}
             >
               Экспортировать в Excel
             </Button>
             <Button
               type="default"
               onClick={handleExportPdf}
               loading={loading}
               icon={<FilePdfOutlined />}
             >
               Экспортировать в PDF
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