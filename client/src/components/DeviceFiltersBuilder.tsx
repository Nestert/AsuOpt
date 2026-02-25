import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button, Select, Input, Dropdown, MenuProps, Tag, Popover } from 'antd';
import { FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { DeviceFiltersInterface } from '../interfaces/DeviceFilters';
import { DeviceReference } from '../interfaces/DeviceReference';

const { Option } = Select;

// Определение структуры доступных фильтров
interface FilterFieldDef {
    key: keyof DeviceFiltersInterface;
    label: string;
    type: 'select' | 'string' | 'dateRange' | 'checkbox';
    group: 'basic' | 'kip' | 'zra' | 'system';
}

const FILTER_FIELDS: FilterFieldDef[] = [
    // System
    { key: 'dataType', label: 'Тип данных', type: 'checkbox', group: 'system' },

    // Basic
    { key: 'deviceType', label: 'Тип устройства', type: 'select', group: 'basic' },
    { key: 'systemCode', label: 'Код системы', type: 'select', group: 'basic' },
    { key: 'plcType', label: 'ПЛК', type: 'select', group: 'basic' },
    { key: 'exVersion', label: 'Ex-версия', type: 'select', group: 'basic' },
    { key: 'posDesignation', label: 'Позиция', type: 'string', group: 'basic' },
    { key: 'description', label: 'Описание', type: 'string', group: 'basic' },

    // KIP
    { key: 'section', label: 'Участок', type: 'select', group: 'kip' },
    { key: 'unitArea', label: 'Площадка', type: 'select', group: 'kip' },
    { key: 'manufacturer', label: 'Производитель', type: 'select', group: 'kip' },
    { key: 'measureUnit', label: 'Ед. измерения', type: 'select', group: 'kip' },
    { key: 'responsibilityZone', label: 'Зона ответственности', type: 'select', group: 'kip' },
    { key: 'connectionScheme', label: 'Схема подключения', type: 'select', group: 'kip' },

    // ZRA
    { key: 'designType', label: 'Тип конструкции', type: 'select', group: 'zra' },
    { key: 'valveType', label: 'Тип клапана', type: 'select', group: 'zra' },
    { key: 'actuatorType', label: 'Тип привода', type: 'select', group: 'zra' },
    { key: 'nominalDiameter', label: 'Номинальный диаметр', type: 'select', group: 'zra' },
    { key: 'pipeMaterial', label: 'Материал трубопровода', type: 'select', group: 'zra' },
    { key: 'medium', label: 'Среда', type: 'select', group: 'zra' },
];

const GROUP_LABELS = {
    basic: 'Основные',
    kip: 'КИП',
    zra: 'ЗРА',
    system: 'Системные'
};

interface DeviceFiltersBuilderProps {
    onApplyFilters: (filters: DeviceFiltersInterface) => void;
    devices: DeviceReference[];
    initialFilters?: DeviceFiltersInterface;
}

interface FilterEditorProps {
    fieldKey: string;
    activeFilters: DeviceFiltersInterface;
    availableValues: Record<string, { value: string; count: number }[]>;
    updateFilter: (key: keyof DeviceFiltersInterface, value: any) => void;
}

const FilterEditor: React.FC<FilterEditorProps> = ({ fieldKey, activeFilters, availableValues, updateFilter }) => {
    const fieldDef = FILTER_FIELDS.find(f => f.key === fieldKey);
    const value = activeFilters[fieldKey as keyof DeviceFiltersInterface];

    if (!fieldDef) return null;

    if (fieldDef.type === 'select') {
        const options = availableValues[fieldKey] || [];
        return (
            <Select
                mode="multiple"
                style={{ minWidth: 200, maxWidth: 350 }}
                placeholder={`Выберите ${fieldDef.label.toLowerCase()}`}
                value={value as string[]}
                onChange={(v) => updateFilter(fieldKey as keyof DeviceFiltersInterface, v)}
                allowClear
                autoFocus
                defaultOpen={true}
                onClick={(e) => e.stopPropagation()}
                getPopupContainer={(triggerNode) => triggerNode.parentNode}
            >
                {options.map(opt => (
                    <Option key={opt.value} value={opt.value}>
                        {opt.value} <span style={{ color: '#ccc', fontSize: '0.8em' }}>({opt.count})</span>
                    </Option>
                ))}
            </Select>
        );
    }

    if (fieldDef.type === 'string') {
        return (
            <Input
                placeholder={`Введите ${fieldDef.label.toLowerCase()}`}
                value={value as string}
                onChange={(e) => updateFilter(fieldKey as keyof DeviceFiltersInterface, e.target.value)}
                allowClear
                autoFocus
                style={{ width: 200 }}
                onClick={(e) => e.stopPropagation()}
            />
        );
    }

    return <div>Unsupported type</div>;
};

interface ActiveFilterTagProps {
    fieldKey: string;
    activeFilters: DeviceFiltersInterface;
    availableValues: Record<string, { value: string; count: number }[]>;
    updateFilter: (key: keyof DeviceFiltersInterface, value: any) => void;
    removeFilter: (key: keyof DeviceFiltersInterface) => void;
}

const ActiveFilterTag: React.FC<ActiveFilterTagProps> = ({ fieldKey, activeFilters, availableValues, updateFilter, removeFilter }) => {
    const fieldDef = FILTER_FIELDS.find(f => f.key === fieldKey);
    const value = activeFilters[fieldKey as keyof DeviceFiltersInterface];
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Если значение пустое (только что добавили), сразу открываем поповер
        if ((Array.isArray(value) && value.length === 0) || value === '') {
            setIsOpen(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!fieldDef) return null;

    // Форматирование значения для отображения в теге
    let displayValue = '';
    if (Array.isArray(value)) {
        if (value.length === 0) displayValue = 'Все';
        else if (value.length <= 2) displayValue = value.join(', ');
        else displayValue = `${value[0]}, +${value.length - 1} еще`;
    } else {
        displayValue = value as string || 'Не задано';
    }

    return (
        <Popover
            content={<FilterEditor fieldKey={fieldKey} activeFilters={activeFilters} availableValues={availableValues} updateFilter={updateFilter} />}
            trigger="click"
            placement="bottomLeft"
            open={isOpen}
            onOpenChange={setIsOpen}
        >
            <Tag
                closable
                onClose={(e) => {
                    e.preventDefault(); // Предотвращаем срабатывание popover при закрытии
                    removeFilter(fieldKey as keyof DeviceFiltersInterface);
                }}
                style={{
                    cursor: 'pointer',
                    padding: '4px 8px',
                    background: '#f0f5ff',
                    borderColor: '#adc6ff',
                    color: '#2f54eb',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}
            >
                <span style={{ fontWeight: 500 }}>{fieldDef.label}:</span>
                <span style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayValue}</span>
            </Tag>
        </Popover>
    );
};

const DeviceFiltersBuilder: React.FC<DeviceFiltersBuilderProps> = ({
    onApplyFilters,
    devices,
    initialFilters = {}
}) => {
    const [activeFilters, setActiveFilters] = useState<DeviceFiltersInterface>(initialFilters);
    const [isAdding, setIsAdding] = useState(false);

    // Синхронизация фильтров при их изменении извне (например, сброс из родительского компонента)
    useEffect(() => {
        // Мы обновляем локальный стейт только если `initialFilters` пустой (нажали Сбросить)
        // или если он реально отличается от текущего `activeFilters` (примитивная глубокая проверка)
        if (Object.keys(initialFilters).length === 0 && Object.keys(activeFilters).length > 0) {
            setActiveFilters({});
        }
    }, [initialFilters, activeFilters]);

    // Доступные значения для select полей, извлеченные из devices
    const [availableValues, setAvailableValues] = useState<Record<string, { value: string; count: number }[]>>({});

    // Извлечение уникальных значений (аналогично старому DeviceFilters.tsx)
    useEffect(() => {
        if (!devices || devices.length === 0) return;

        const valueCounts: Record<string, Record<string, number>> = {};
        FILTER_FIELDS.filter(f => f.type === 'select').forEach(f => {
            valueCounts[f.key] = {};
        });

        devices.forEach(device => {
            // Сбор по basic полям
            if (device.deviceType) valueCounts['deviceType'][device.deviceType] = (valueCounts['deviceType'][device.deviceType] || 0) + 1;

            // SystemCode может быть в parentSystem
            const sysCode = device.systemCode || device.parentSystem;
            if (sysCode) valueCounts['systemCode'][sysCode] = (valueCounts['systemCode'][sysCode] || 0) + 1;

            const kip: any = (device as any).kip;
            const zra: any = (device as any).zra;

            // PLC Type
            const plc = device.plcType || kip?.plc || zra?.plc;
            if (plc) valueCounts['plcType'][plc] = (valueCounts['plcType'][plc] || 0) + 1;

            // Ex Version
            const exVer = device.exVersion || kip?.exVersion || zra?.exVersion;
            if (exVer) valueCounts['exVersion'][exVer] = (valueCounts['exVersion'][exVer] || 0) + 1;

            // KIP fields
            if (kip) {
                if (kip.section && valueCounts['section']) valueCounts['section'][kip.section] = (valueCounts['section'][kip.section] || 0) + 1;
                if (kip.unitArea && valueCounts['unitArea']) valueCounts['unitArea'][kip.unitArea] = (valueCounts['unitArea'][kip.unitArea] || 0) + 1;
                if (kip.manufacturer && valueCounts['manufacturer']) valueCounts['manufacturer'][kip.manufacturer] = (valueCounts['manufacturer'][kip.manufacturer] || 0) + 1;
                if (kip.measureUnit && valueCounts['measureUnit']) valueCounts['measureUnit'][kip.measureUnit] = (valueCounts['measureUnit'][kip.measureUnit] || 0) + 1;
                if (kip.responsibilityZone && valueCounts['responsibilityZone']) valueCounts['responsibilityZone'][kip.responsibilityZone] = (valueCounts['responsibilityZone'][kip.responsibilityZone] || 0) + 1;
                if (kip.connectionScheme && valueCounts['connectionScheme']) valueCounts['connectionScheme'][kip.connectionScheme] = (valueCounts['connectionScheme'][kip.connectionScheme] || 0) + 1;
            }

            // ZRA fields
            if (zra) {
                // Если у ZRA есть своя unitArea
                if (zra.unitArea && valueCounts['unitArea']) valueCounts['unitArea'][zra.unitArea] = (valueCounts['unitArea'][zra.unitArea] || 0) + 1;
                if (zra.designType && valueCounts['designType']) valueCounts['designType'][zra.designType] = (valueCounts['designType'][zra.designType] || 0) + 1;
                if (zra.valveType && valueCounts['valveType']) valueCounts['valveType'][zra.valveType] = (valueCounts['valveType'][zra.valveType] || 0) + 1;
                if (zra.actuatorType && valueCounts['actuatorType']) valueCounts['actuatorType'][zra.actuatorType] = (valueCounts['actuatorType'][zra.actuatorType] || 0) + 1;
                if (zra.nominalDiameter && valueCounts['nominalDiameter']) valueCounts['nominalDiameter'][zra.nominalDiameter] = (valueCounts['nominalDiameter'][zra.nominalDiameter] || 0) + 1;
                if (zra.pipeMaterial && valueCounts['pipeMaterial']) valueCounts['pipeMaterial'][zra.pipeMaterial] = (valueCounts['pipeMaterial'][zra.pipeMaterial] || 0) + 1;
                if (zra.medium && valueCounts['medium']) valueCounts['medium'][zra.medium] = (valueCounts['medium'][zra.medium] || 0) + 1;
            }
        });

        const result: Record<string, { value: string; count: number }[]> = {};
        Object.keys(valueCounts).forEach(key => {
            result[key] = Object.entries(valueCounts[key])
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => b.count - a.count);
        });

        setAvailableValues(result);
    }, [devices]);

    // Обновление фильтров и проброс наверх
    const updateFilter = useCallback((key: keyof DeviceFiltersInterface, value: any) => {
        let newFilters = { ...activeFilters };

        // Сохраняем пустые значения ('', []), чтобы тег оставался в UI,
        // а удаляем только если передано undefined (при явном удалении фильтра)
        if (value === undefined || value === null) {
            delete newFilters[key];
        } else {
            newFilters = { ...newFilters, [key]: value };
        }

        setActiveFilters(newFilters);
        onApplyFilters(newFilters);
    }, [activeFilters, onApplyFilters]);

    const removeFilter = useCallback((key: keyof DeviceFiltersInterface) => {
        updateFilter(key, undefined);
    }, [updateFilter]);

    const clearAllFilters = useCallback(() => {
        setActiveFilters({});
        onApplyFilters({});
    }, [onApplyFilters]);

    // Меню выбора нового поля для фильтрации
    const addFilterMenuItems: MenuProps['items'] = useMemo(() => {
        const items: MenuProps['items'] = [];

        // Группируем поля
        const groupedFields = FILTER_FIELDS.reduce((acc, field) => {
            if (!acc[field.group]) acc[field.group] = [];
            acc[field.group].push(field);
            return acc;
        }, {} as Record<string, FilterFieldDef[]>);

        Object.entries(groupedFields).forEach(([groupName, fields]) => {
            items.push({
                key: `group-${groupName}`,
                type: 'group',
                label: GROUP_LABELS[groupName as keyof typeof GROUP_LABELS],
                children: fields.map(field => ({
                    key: field.key,
                    label: field.label,
                    disabled: activeFilters[field.key] !== undefined, // Отключаем, если уже добавлен
                    onClick: () => {
                        // Инициализируем пустым значением подходящего типа
                        const emptyValue = field.type === 'select' ? [] : (field.type === 'checkbox' ? ['kip', 'zra', 'unknown'] : '');
                        updateFilter(field.key, emptyValue);
                        setIsAdding(false);
                    }
                }))
            });
        });

        return items;
    }, [activeFilters, updateFilter]);



    const activeFilterKeys = Object.keys(activeFilters).filter(k => k !== 'dataType' || (activeFilters.dataType && activeFilters.dataType.length < 3));

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <FilterOutlined style={{ color: '#8c8c8c' }} />

            {activeFilterKeys.map(key => (
                <ActiveFilterTag
                    key={key}
                    fieldKey={key}
                    activeFilters={activeFilters}
                    availableValues={availableValues}
                    updateFilter={updateFilter}
                    removeFilter={removeFilter}
                />
            ))}

            <Dropdown
                menu={{ items: addFilterMenuItems }}
                trigger={['click']}
                open={isAdding}
                onOpenChange={setIsAdding}
            >
                <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    style={{ borderRadius: '16px' }}
                >
                    Добавить фильтр
                </Button>
            </Dropdown>

            {activeFilterKeys.length > 0 && (
                <Button
                    type="text"
                    size="small"
                    onClick={clearAllFilters}
                    style={{ color: '#8c8c8c', fontSize: '12px' }}
                >
                    Сбросить все
                </Button>
            )}
        </div>
    );
};

export default DeviceFiltersBuilder;
