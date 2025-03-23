export interface Signal {
  id: number;
  name: string;
  type: 'AI' | 'AO' | 'DI' | 'DO';
  description: string;
  totalCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceSignal {
  id: number;
  deviceId: number;
  signalId: number;
  count: number;
  signal?: Signal;
  createdAt?: string;
  updatedAt?: string;
}

export interface SignalSummary {
  type: 'AI' | 'AO' | 'DI' | 'DO';
  totalCount: number;
} 