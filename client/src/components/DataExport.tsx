import React, { useState } from 'react';
import { Card, Button, Typography, Spin, Alert, App, Tabs } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import SignalExport from './SignalExport';
import QuestionnaireExport from './QuestionnaireExport';
import { useProject } from '../contexts/ProjectContext';

const { Title } = Typography;

// Компонент-обертка для использования App.useApp()
const DataExport: React.FC = () => {
  return (
    <App>
      <DataExportContent />
    </App>
  );
};

// Основной контент компонента
const DataExportContent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { message: msg } = App.useApp();
  const { currentProjectId } = useProject();

  // Обработчик экспорта устройств в Excel
  const handleExportDevices = async () => {
    try {
      setLoading(true);

      const response = await fetch(`http://localhost:3001/api/exports/excel`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Не удалось экспортировать устройства');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devices_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      msg.success('Устройства успешно экспортированы в Excel');
    } catch (error) {
      console.error('Ошибка при экспорте устройств:', error);
      msg.error('Не удалось экспортировать устройства');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="data-export">
      <Title level={3}>Экспорт данных</Title>

      <Alert
        message="Экспорт данных системы"
        description="Вы можете экспортировать данные устройств и сигналов в различных форматах (Excel, PDF)."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Tabs
        defaultActiveKey="signals"
        items={[
          {
            key: 'signals',
            label: 'Экспорт сигналов',
            children: <SignalExport projectId={currentProjectId} />
          },
          {
            key: 'devices',
            label: 'Экспорт устройств',
            children: (
              <Card variant="borderless">
                <Title level={4}>Экспорт устройств</Title>
                <Alert
                  message="Экспорт всех устройств"
                  description="Этот экспорт включает все устройства из системы в формате Excel."
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                 <Button
                   type="primary"
                   onClick={handleExportDevices}
                   loading={loading}
                   icon={<FileExcelOutlined />}
                   size="large"
                 >
                   Экспортировать устройства в Excel
                 </Button>

                {loading && (
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Spin />
                    <div style={{ marginTop: 8 }}>Подготовка файла для экспорта...</div>
                  </div>
                )}
              </Card>
            )
          },
          {
            key: 'questionnaires',
            label: 'Опросные листы',
            children: <QuestionnaireExport projectId={currentProjectId} />
          }
        ]}
      />
    </div>
  );
};

export default DataExport;