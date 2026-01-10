import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignalTable from '../components/SignalTable';

// Мокаем API
jest.mock('../services/api', () => ({
  deviceTypeSignalService: {
    getSignalsSummary: jest.fn().mockResolvedValue({
      deviceTypeSignals: [
        {
          deviceType: 'PLC',
          aiCount: 10,
          aoCount: 5,
          diCount: 20,
          doCount: 15
        }
      ]
    }),
    getUniqueDeviceTypesFromReference: jest.fn().mockResolvedValue(['PLC', 'Sensor'])
  }
}));

// Мокаем App.useApp
jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  return {
    ...antd,
    App: {
      useApp: () => ({
        message: { success: jest.fn(), error: jest.fn() },
        modal: { confirm: jest.fn() }
      })
    }
  };
});

describe('SignalTable', () => {
  it('renders signal table with data', async () => {
    render(<SignalTable projectId={1} />);

    // Ждем загрузки данных
    await waitFor(() => {
      expect(screen.getByText('PLC')).toBeInTheDocument();
    });

    expect(screen.getByText('Сводная таблица сигналов')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // AI count
    expect(screen.getByText('5')).toBeInTheDocument();  // AO count
  });

  it('displays action buttons', async () => {
    render(<SignalTable projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Автозаполнение/)).toBeInTheDocument();
    });

    expect(screen.getByText('Очистить таблицу')).toBeInTheDocument();
  });
});