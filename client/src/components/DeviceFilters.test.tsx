import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
  });

  it('renders filter form', () => {
    render(
      <DeviceFilters
        onApplyFilters={mockOnApplyFilters}
        devices={mockDevices}
      />
    );

    expect(screen.getByText('Фильтры устройств')).toBeInTheDocument();
    expect(screen.getByText('Применить')).toBeInTheDocument();
    expect(screen.getByText('Сбросить')).toBeInTheDocument();
  });

  it('displays available filter options', () => {
    render(
      <DeviceFilters
        onApplyFilters={mockOnApplyFilters}
        devices={mockDevices}
      />
    );

    // Проверяем, что опции фильтров отображаются
    expect(screen.getByText('PLC')).toBeInTheDocument();
    expect(screen.getByText('SYS001')).toBeInTheDocument();
  });

  it('calls onApplyFilters when form is submitted', () => {
    render(
      <DeviceFilters
        onApplyFilters={mockOnApplyFilters}
        devices={mockDevices}
      />
    );

    const submitButton = screen.getByText('Применить');
    fireEvent.click(submitButton);

    expect(mockOnApplyFilters).toHaveBeenCalledWith({});
  });

  it('shows saved presets button when presets exist', () => {
    // Мокаем localStorage
    const mockGetItem = jest.spyOn(Storage.prototype, 'getItem');
    mockGetItem.mockReturnValue(JSON.stringify([
      { name: 'Test Preset', filters: { deviceType: ['PLC'] } }
    ]));

    render(
      <DeviceFilters
        onApplyFilters={mockOnApplyFilters}
        devices={mockDevices}
      />
    );

    expect(screen.getByText('Сохранить')).toBeInTheDocument();

    mockGetItem.mockRestore();
  });
});