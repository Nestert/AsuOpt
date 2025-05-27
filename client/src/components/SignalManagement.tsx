import React, { useState } from 'react';
import { Tabs } from 'antd';
import SignalTable from './SignalTable';
import SignalDefinitions from './SignalDefinitions';
import SignalExport from './SignalExport';
import { useProject } from '../contexts/ProjectContext';

const SignalManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const { currentProjectId } = useProject();

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  return (
    <div className="signal-management">
      <Tabs 
        defaultActiveKey="summary" 
        onChange={handleTabChange}
        items={[
          {
            key: 'summary',
            label: 'Сводная таблица сигналов',
            children: <SignalTable projectId={currentProjectId} />
          },
          {
            key: 'definitions',
            label: 'Типы сигналов',
            children: <SignalDefinitions projectId={currentProjectId} />
          },
          {
            key: 'export',
            label: 'Экспорт сигналов',
            children: <SignalExport projectId={currentProjectId} />
          }
        ]}
      />
    </div>
  );
};

export default SignalManagement; 