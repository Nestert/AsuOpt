import React from 'react';
import { Tabs } from 'antd';
import SignalTable from './SignalTable';
import SignalDefinitions from './SignalDefinitions';
import SignalGeneration from './SignalGeneration';
import { useProject } from '../contexts/ProjectContext';

const SignalManagement: React.FC = () => {
  const { currentProjectId } = useProject();

  return (
    <div className="signal-management">
      <Tabs
        defaultActiveKey="summary"
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
            key: 'generation',
            label: 'Генерация сигналов',
            children: <SignalGeneration projectId={currentProjectId} />
          }
        ]}
      />
    </div>
  );
};

export default SignalManagement; 