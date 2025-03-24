export interface DeviceTypeSignal {
  id?: number;
  deviceType: string;
  aiCount: number;
  aoCount: number;
  diCount: number;
  doCount: number;
  deviceCount?: number;
}

export interface SignalSummary {
  totalAI: number;
  totalAO: number;
  totalDI: number;
  totalDO: number;
  totalSignals: number;
  totalDevices?: number;
}

export interface SignalsSummary {
  deviceTypeSignals: DeviceTypeSignal[];
  summary: SignalSummary;
} 