import React, { useState } from 'react';
import { Tabs } from 'antd';
import SignalTable from './SignalTable';
import SignalDefinitions from './SignalDefinitions';
import SignalExport from './SignalExport';

const SignalManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('summary');

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
            children: <SignalTable />
          },
          {
            key: 'definitions',
            label: 'Типы сигналов',
            children: <SignalDefinitions />
          },
          {
            key: 'export',
            label: 'Экспорт сигналов',
            children: <SignalExport />
          }
        ]}
      />
    </div>
  );
};

export default SignalManagement; 