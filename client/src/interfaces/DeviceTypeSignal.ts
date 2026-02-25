export interface DeviceTypeSignal {
  id?: number;
  deviceType: string;
  aiCount: number;
  aoCount: number;
  diCount: number;
  doCount: number;
  deviceCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SignalsSummary {
  deviceTypeSignals: DeviceTypeSignal[];
  summary: {
    totalAI: number;
    totalAO: number;
    totalDI: number;
    totalDO: number;
    totalSignals: number;
    totalDevices: number;
  };
}
