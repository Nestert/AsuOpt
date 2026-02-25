export interface DeviceFiltersInterface {
    deviceType?: string[];
    systemCode?: string[];
    plcType?: string[];
    exVersion?: string[];
    posDesignation?: string;
    description?: string;
    searchText?: string;
    createdAtStart?: string;
    createdAtEnd?: string;
    updatedAtStart?: string;
    updatedAtEnd?: string;

    // КИП специфичные поля
    section?: string[];
    unitArea?: string[];
    manufacturer?: string[];
    measureUnit?: string[];
    responsibilityZone?: string[];
    connectionScheme?: string[];
    power?: string[];
    environmentCharacteristics?: string[];
    signalPurpose?: string[];

    // ЗРА специфичные поля
    designType?: string[];
    valveType?: string[];
    actuatorType?: string[];
    pipePosition?: string[];
    nominalDiameter?: string[];
    pressureRating?: string[];
    pipeMaterial?: string[];
    medium?: string[];
    positionSensor?: string[];
    solenoidType?: string[];
    emergencyPosition?: string[];

    // Фильтр по типу данных
    dataType?: ('kip' | 'zra' | 'unknown')[];
}
