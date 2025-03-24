// Интерфейс справочника устройств
export interface DeviceReference {
  id: number;
  posDesignation: string;
  deviceType: string;
  description?: string;
  parentSystem?: string;
  systemCode?: string;
  plcType?: string;
  exVersion?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Интерфейс данных КИП
export interface Kip {
  id: number;
  deviceReferenceId: number;
  section?: string;
  unitArea?: string;
  manufacturer?: string;
  article?: string;
  measureUnit?: string;
  scale?: string;
  note?: string;
  docLink?: string;
  responsibilityZone?: string;
  connectionScheme?: string;
  power?: string;
  plc?: string;
  exVersion?: string;
  environmentCharacteristics?: string;
  signalPurpose?: string;
  controlPoints?: number;
  completeness?: string;
  measuringLimits?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Интерфейс данных ЗРА
export interface Zra {
  id: number;
  deviceReferenceId: number;
  unitArea?: string;
  designType?: string;
  valveType?: string;
  actuatorType?: string;
  pipePosition?: string;
  nominalDiameter?: string;
  pressureRating?: string;
  pipeMaterial?: string;
  medium?: string;
  positionSensor?: string;
  solenoidType?: string;
  emergencyPosition?: string;
  controlPanel?: string;
  airConsumption?: string;
  connectionSize?: string;
  fittingsCount?: number;
  tubeDiameter?: string;
  limitSwitchType?: string;
  positionerType?: string;
  deviceDescription?: string;
  category?: string;
  plc?: string;
  exVersion?: string;
  operation?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Интерфейс полных данных устройства
export interface DeviceFullData {
  reference: DeviceReference;
  kip?: Kip;
  zra?: Zra;
  dataType: 'kip' | 'zra' | 'unknown';
}

// Интерфейс для узла дерева
export interface TreeNode {
  id: string | number;
  name: string;
  children?: TreeNode[];
  description?: string;
  type?: string;
  isLeaf?: boolean;
} 