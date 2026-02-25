import React, { useState, useEffect } from 'react';
import { Table, Select, Typography, Alert } from 'antd';

const { Option } = Select;
const { Text } = Typography;

export interface FieldDefinition {
    key: string;
    name: string;
    required?: boolean;
}

interface ColumnMapperProps {
    requiredFields: FieldDefinition[];
    availableColumns: string[];
    sampleData: any[];
    onMapChange: (map: Record<string, string>) => void;
}

const ColumnMapper: React.FC<ColumnMapperProps> = ({
    requiredFields,
    availableColumns,
    sampleData,
    onMapChange
}) => {
    const [columnMap, setColumnMap] = useState<Record<string, string>>({});

    // Автоматическое первоначальное сопоставление
    useEffect(() => {
        const initialMap: Record<string, string> = {};
        requiredFields.forEach(field => {
            // Ищем точное совпадение или совпадение без учета регистра
            const match = availableColumns.find(
                col => col.toLowerCase() === field.name.toLowerCase() ||
                    col.toLowerCase().includes(field.name.toLowerCase()) ||
                    field.name.toLowerCase().includes(col.toLowerCase())
            );
            if (match) {
                initialMap[field.key] = match;
            }
        });
        setColumnMap(initialMap);
        onMapChange(initialMap);
    }, [requiredFields, availableColumns, onMapChange]); // Добавлен onMapChange в зависимости, чтобы передать initial state

    const handleSelectChange = (fieldKey: string, columnName: string) => {
        const newMap = { ...columnMap, [fieldKey]: columnName };
        setColumnMap(newMap);
        onMapChange(newMap);
    };

    const columns = [
        {
            title: 'Требуемое поле (Система)',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: FieldDefinition) => (
                <span>
                    {record.required && <Text type="danger">* </Text>}
                    {text}
                </span>
            ),
            width: '30%',
        },
        {
            title: 'Столбец из вашего файла',
            dataIndex: 'key',
            key: 'mapping',
            render: (key: string) => (
                <Select
                    allowClear
                    style={{ width: '100%' }}
                    placeholder="Выберите столбец"
                    value={columnMap[key]}
                    onChange={(val) => handleSelectChange(key, val)}
                >
                    {availableColumns.map(col => (
                        <Option key={col} value={col}>{col}</Option>
                    ))}
                </Select>
            ),
            width: '40%',
        },
        {
            title: 'Пример данных',
            key: 'sample',
            render: (_: any, record: FieldDefinition) => {
                const mappedCol = columnMap[record.key];
                if (!mappedCol || sampleData.length === 0) return <Text type="secondary">-</Text>;

                // Показываем значение из первой строки с данными
                return <Text>{sampleData[0][mappedCol] || <Text type="secondary">пусто</Text>}</Text>;
            },
            width: '30%',
        }
    ];

    const missingRequired = requiredFields.filter(f => f.required && !columnMap[f.key]);

    return (
        <div className="column-mapper">
            {missingRequired.length > 0 && (
                <Alert
                    message="Требуется выбрать обязательные столбцы"
                    description={`Необходимо сопоставить следующие поля: ${missingRequired.map(f => f.name).join(', ')}`}
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}
            <Table
                dataSource={requiredFields}
                columns={columns}
                pagination={false}
                rowKey="key"
                size="small"
                bordered
            />
        </div>
    );
};

export default ColumnMapper; 
