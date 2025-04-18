import React, { useEffect, useState } from 'react';
import { Empty, Input, Spin, Tree, Typography, Button, Select } from 'antd';
import {
  FolderOutlined,
  AppstoreOutlined,
  SearchOutlined,
  PlusOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { deviceService } from '../services/api';
import { DeviceReference } from '../interfaces/DeviceReference';
import AddDeviceForm from './AddDeviceForm';

const { Search } = Input;
const { Text } = Typography;
const { Option } = Select;

interface DeviceTreeProps {
  onSelectDevice: (deviceId: number) => void;
  updateCounter?: number; // Счетчик обновлений для триггера перезагрузки дерева
}

// Интерфейс для узла нашего кастомного дерева
interface CustomTreeNode {
  id: string;
  name: string;
  children: CustomTreeNode[];
  originalId?: number; // Оригинальный ID устройства, если это лист
  posDesignation?: string; // Полное обозначение позиции, если это лист
  deviceType?: string; // Тип устройства, если это лист
  isLeaf?: boolean;
}

const DeviceTree: React.FC<DeviceTreeProps> = ({ onSelectDevice, updateCounter = 0 }) => {
  const [devices, setDevices] = useState<DeviceReference[]>([]);
  const [treeData, setTreeData] = useState<CustomTreeNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('');
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddDeviceVisible, setIsAddDeviceVisible] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [filteredDevices, setFilteredDevices] = useState<DeviceReference[]>([]);

  // Функция для разбиения строки posDesignation на части
  const parsePosDesignation = (posDesignation: string): string[] => {
    // Регулярное выражение для разбиения по разделителям (все, что не буквы и не цифры)
    return posDesignation
      .split(/[^a-zA-Z0-9]+/)
      .filter(part => part.length > 0); // Убираем пустые части
  };

  // Функция построения кастомного дерева
  const buildCustomTree = (devices: DeviceReference[]): CustomTreeNode[] => {
    const rootNode: CustomTreeNode = {
      id: 'root',
      name: 'Устройства',
      children: []
    };

    // Перебираем все устройства
    devices.forEach(device => {
      const parts = parsePosDesignation(device.posDesignation);
      let currentNode = rootNode;

      // Строим путь в дереве для каждой части
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLastPart = i === parts.length - 1;
        
        // Ищем существующий узел для текущей части
        let childNode = currentNode.children.find(child => child.name === part);
        
        if (!childNode) {
          // Создаем новый узел, если он не найден
          childNode = {
            id: `${currentNode.id}_${part}`,
            name: part,
            children: [],
            isLeaf: isLastPart
          };
          
          // Если это последняя часть, добавляем оригинальный ID и полное posDesignation
          if (isLastPart) {
            childNode.originalId = device.id;
            childNode.posDesignation = device.posDesignation;
            childNode.deviceType = device.deviceType;
          }
          
          currentNode.children.push(childNode);
        }
        
        currentNode = childNode;
      }
    });

    // Сортируем узлы по имени на каждом уровне
    const sortNodes = (nodes: CustomTreeNode[]): CustomTreeNode[] => {
      return nodes
        .map(node => ({
          ...node,
          children: sortNodes(node.children)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    };

    return sortNodes(rootNode.children);
  };

  // Загрузка устройств
  useEffect(() => {
    console.log('DeviceTree: запускаем загрузку устройств, updateCounter =', updateCounter);
    const fetchDevices = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await deviceService.getAllDevices();
        console.log('Загружены устройства:', data.length, 'элементов');
        setDevices(data);
        setFilteredDevices(data);
        
        // Извлекаем уникальные типы устройств для фильтра
        const types = Array.from(new Set(data.map(device => device.deviceType).filter(Boolean)));
        setDeviceTypes(types);
        
        const customTree = buildCustomTree(data);
        setTreeData(customTree);
      } catch (err) {
        console.error('Ошибка при загрузке устройств:', err);
        setError('Не удалось загрузить устройства');
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [updateCounter]); // Зависимость от updateCounter для перезагрузки при изменениях

  // Эффект для фильтрации устройств при изменении фильтра
  useEffect(() => {
    let filtered;
    if (!deviceTypeFilter) {
      filtered = devices;
    } else {
      filtered = devices.filter(device => device.deviceType === deviceTypeFilter);
    }
    
    // Обновляем дерево с отфильтрованными устройствами
    const customTree = buildCustomTree(filtered);
    
    setFilteredDevices(filtered);
    setTreeData(customTree);
    
    // Сбрасываем развернутые узлы при изменении фильтра
    setExpandedKeys([]);
    
  }, [deviceTypeFilter, devices]);

  // Обработчик изменения фильтра типа устройства
  const handleDeviceTypeChange = (value: string) => {
    setDeviceTypeFilter(value);
  };

  // Поиск в дереве устройств
  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (!value) {
      setExpandedKeys([]);
      setAutoExpandParent(false);
      return;
    }

    const expandKeys: React.Key[] = [];
    
    // Рекурсивный поиск в дереве
    const searchTree = (nodes: CustomTreeNode[], parentKey: string = '') => {
      nodes.forEach(node => {
        const nodeKey = node.id;
        
        // Если узел содержит искомый текст, добавляем его и все родительские узлы
        if (node.name.toLowerCase().includes(value.toLowerCase()) || 
            (node.posDesignation && node.posDesignation.toLowerCase().includes(value.toLowerCase()))) {
          expandKeys.push(nodeKey);
          
          // Добавляем родительский ключ, если он существует
          if (parentKey) {
            expandKeys.push(parentKey);
          }
        }
        
        // Рекурсивно ищем в дочерних узлах
        if (node.children && node.children.length > 0) {
          searchTree(node.children, nodeKey);
        }
      });
    };
    
    searchTree(treeData);
    setExpandedKeys(Array.from(new Set(expandKeys)));
    setAutoExpandParent(true);
  };

  // Сброс всех фильтров
  const resetFilters = () => {
    setSearchValue('');
    setDeviceTypeFilter('');
    setExpandedKeys([]);
    setAutoExpandParent(false);
  };

  // Обработка развертывания узлов дерева
  const onExpand = (expandedKeysValue: React.Key[]) => {
    setExpandedKeys(expandedKeysValue);
    setAutoExpandParent(false);
  };

  // Обработка выбора устройства
  const onSelect = (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0) {
      console.log('onSelect: выбраны ключи =', selectedKeys);
      
      // Получаем информацию о выбранном узле
      const selectedNode = info.node;
      
      // Проверяем, что узел является листом и имеет originalId
      if (selectedNode.isLeaf && selectedNode.originalId) {
        const deviceId = selectedNode.originalId;
        console.log('onSelect: выбрано устройство с ID =', deviceId);
        onSelectDevice(deviceId);
        // Сохраняем ID выбранного устройства как потенциального родителя
        setSelectedParentId(deviceId);
      } else {
        console.log('onSelect: выбран не лист дерева, действие не требуется');
        setSelectedParentId(null);
      }
    }
  };

  // Показать форму добавления устройства
  const showAddDeviceForm = () => {
    setIsAddDeviceVisible(true);
  };

  // Скрыть форму добавления устройства
  const hideAddDeviceForm = () => {
    setIsAddDeviceVisible(false);
  };

  // Обработчик успешного добавления устройства
  const handleDeviceAdded = () => {
    console.log('DeviceTree: устройство успешно добавлено, обновляем дерево');
    // Закрываем форму
    hideAddDeviceForm();
    // Увеличиваем счетчик обновлений, чтобы перезагрузить дерево
    const fetchDevices = async () => {
      setLoading(true);
      try {
        const data = await deviceService.getAllDevices();
        console.log('Загружены устройства после добавления:', data.length, 'элементов');
        
        // Обновляем список типов устройств
        const types = Array.from(new Set(data.map(device => device.deviceType).filter(Boolean)));
        setDeviceTypes(types);
        
        // Устанавливаем новые данные, фильтрация произойдет в useEffect
        setDevices(data);
      } catch (err) {
        console.error('Ошибка при загрузке устройств после добавления:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  };

  // Функция для рендеринга заголовка узла с подсветкой поискового запроса
  const renderTitle = (node: CustomTreeNode) => {
    const name = node.name;
    
    // Для листьев показываем полное обозначение позиции
    const displayText = node.isLeaf && node.posDesignation ? node.posDesignation : name;
    
    if (!searchValue || displayText.toLowerCase().indexOf(searchValue.toLowerCase()) === -1) {
      return <span>{displayText}</span>;
    }
    
    const index = displayText.toLowerCase().indexOf(searchValue.toLowerCase());
    const beforeStr = displayText.substring(0, index);
    const matchStr = displayText.substring(index, index + searchValue.length);
    const afterStr = displayText.substring(index + searchValue.length);
    
    return (
      <span>
        {beforeStr}
        <span style={{ color: '#f50' }}>{matchStr}</span>
        {afterStr}
      </span>
    );
  };

  // Функция для преобразования данных в формат, понятный компоненту Tree
  const processTreeData = (nodes: CustomTreeNode[]): { title: React.ReactNode, key: string, icon: React.ReactNode, children?: any[], isLeaf?: boolean, originalId?: number }[] => {
    return nodes.map(node => {
      const title = renderTitle(node);
      
      if (node.children && node.children.length > 0) {
        return {
          title,
          key: node.id,
          icon: <FolderOutlined />,
          children: processTreeData(node.children),
          isLeaf: false
        };
      }
      
      return {
        title,
        key: node.id,
        icon: <AppstoreOutlined />,
        isLeaf: true,
        originalId: node.originalId
      };
    });
  };

  // Отображение ошибки загрузки
  if (error) {
    return (
      <div className="error-message">
        <Text type="danger">{error}</Text>
      </div>
    );
  }

  // Отображение состояния загрузки
  if (loading) {
    return (
      <div className="loading-spinner">
        <Spin size="large" />
        <Text>Загрузка устройств...</Text>
      </div>
    );
  }

  return (
    <div className="device-tree-container">
      <div className="device-tree-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        <Search 
          placeholder="Поиск устройств" 
          allowClear 
          enterButton={<SearchOutlined />}
          onSearch={handleSearch}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          style={{ flex: '1', minWidth: '120px', maxWidth: '300px' }}
        />
        <Select
          placeholder="Тип устройства"
          allowClear
          style={{ flex: '1', minWidth: '120px', maxWidth: '180px' }}
          value={deviceTypeFilter || undefined}
          onChange={handleDeviceTypeChange}
        >
          {deviceTypes.map(type => (
            <Option key={type} value={type}>{type}</Option>
          ))}
        </Select>
        <Button 
          icon={<FilterOutlined />} 
          onClick={resetFilters}
        >
          Сброс
        </Button>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={showAddDeviceForm}
        >
          Добавить
        </Button>
      </div>
      
      {filteredDevices.length > 0 ? (
        <Tree
          showIcon
          expandedKeys={expandedKeys}
          autoExpandParent={autoExpandParent}
          onExpand={onExpand}
          onSelect={onSelect}
          treeData={processTreeData(treeData)}
        />
      ) : (
        <Empty description="Устройства не найдены" />
      )}

      <AddDeviceForm 
        visible={isAddDeviceVisible}
        onCancel={hideAddDeviceForm}
        onSuccess={handleDeviceAdded}
        parentId={selectedParentId}
      />
    </div>
  );
};

export default DeviceTree; 