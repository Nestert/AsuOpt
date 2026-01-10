import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeviceFilters, { DeviceFiltersInterface } from '../components/DeviceFilters';

const mockDevices = [
  {
    id: 1,
    posDesignation: 'TEST-001',
    deviceType: 'PLC',
    systemCode: 'SYS001',
    description: 'Test device',
    projectId: 1
  }
];

const mockOnApplyFilters = jest.fn();
const mockOnApplySearch = jest.fn();

describe('DeviceFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Мокаем localStorage
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  it('renders basic structure', async () => {
    render(
      <DeviceFilters
        onApplyFilters={mockOnApplyFilters}
        devices={mockDevices}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Фильтры устройств')).toBeInTheDocument();
    });
  });

  it('calls onApplyFilters with empty filters initially', async () => {
    render(
      <DeviceFilters
        onApplyFilters={mockOnApplyFilters}
        devices={mockDevices}
      />
    );

    await waitFor(() => {
      expect(mockOnApplyFilters).toHaveBeenCalledWith({});
    });
  });

  it('handles filter presets', async () => {
    const mockGetItem = jest.spyOn(window.localStorage, 'getItem');
    mockGetItem.mockReturnValue(JSON.stringify([
      { name: 'Test Preset', filters: { deviceType: ['PLC'] } }
    ]));

    render(
      <DeviceFilters
        onApplyFilters={mockOnApplyFilters}
        devices={mockDevices}
      />
    );

    // Проверяем, что localStorage был вызван для загрузки пресетов
    expect(mockGetItem).toHaveBeenCalled();

    mockGetItem.mockRestore();
  });
});