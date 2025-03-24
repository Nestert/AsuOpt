import React, { useState } from 'react';
import { Tabs } from 'antd';
import SignalTable from './SignalTable';
import SignalDefinitions from './SignalDefinitions';

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
          }
        ]}
      />
    </div>
  );
};

export default SignalManagement; 