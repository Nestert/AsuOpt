import React, { useEffect, useState } from 'react';
import { Empty, Input, Spin, Tree, Typography } from 'antd';
import {
  FolderOutlined,
  AppstoreOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { deviceService } from '../services/api';
import { DeviceReference } from '../interfaces/DeviceReference';

const { Search } = Input;
const { Text } = Typography;

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
  isLeaf?: boolean;
}

const DeviceTree: React.FC<DeviceTreeProps> = ({ onSelectDevice, updateCounter = 0 }) => {
  const [devices, setDevices] = useState<DeviceReference[]>([]);
  const [treeData, setTreeData] = useState<CustomTreeNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      } else {
        console.log('onSelect: выбран не лист дерева, действие не требуется');
      }
    }
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
      <div className="loading-container">
        <Spin size="large" />
        <Text>Загрузка дерева устройств...</Text>
      </div>
    );
  }

  // Отображение пустого сообщения, если нет данных
  if (treeData.length === 0) {
    return <Empty description="Нет доступных устройств" />;
  }

  const processedTreeData = processTreeData(treeData);

  return (
    <div className="device-tree">
      <Search
        style={{ marginBottom: 8 }}
        placeholder="Поиск устройств"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
        suffix={<SearchOutlined />}
      />
      <Tree
        showIcon
        onExpand={onExpand}
        expandedKeys={expandedKeys}
        autoExpandParent={autoExpandParent}
        onSelect={onSelect}
        treeData={processedTreeData}
      />
    </div>
  );
};

export default DeviceTree; 