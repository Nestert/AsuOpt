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
      ],
      totalSignals: 50
    }),
    getUniqueDeviceTypesFromReference: jest.fn().mockResolvedValue(['PLC', 'Sensor'])
  }
}));

describe('SignalTable', () => {
  it('renders signal table with data', async () => {
    render(<SignalTable projectId={1} />);

    // Ждем загрузки данных
    await waitFor(() => {
      expect(screen.getByText('Сводная таблица сигналов по типам устройств')).toBeInTheDocument();
    });

    expect(screen.getByText('Автоматический подсчет сигналов')).toBeInTheDocument();
  });

  it('handles API calls', async () => {
    const { rerender } = render(<SignalTable projectId={1} />);

    // Проверяем, что компонент рендерится без ошибок
    await waitFor(() => {
      expect(screen.getByText('Сводная таблица сигналов по типам устройств')).toBeInTheDocument();
    });
  });
});