import React, { useState, useEffect } from 'react';
import { TreeView } from '@mui/lab';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LinkIcon from '@mui/icons-material/Link';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { Box, TextField, InputAdornment, Typography, Button, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import '../App.css';

// Интерфейс для устройства
interface Device {
  id: number;
  systemCode: string;
  equipmentCode: string;
  lineNumber: string;
  cabinetName: string;
  deviceDesignation: string;
  deviceType: string;
  description: string;
  parentId: number | null;
  children?: Device[];
}

// Интерфейс для узла древовидной структуры
interface TreeNode {
  id: string;
  name: string;
  devices: Device[];
  children: Record<string, TreeNode>;
  originalDevice?: Device;
}

interface DeviceTreeProps {
  onSelectDevice: (device: Device) => void;
}

const DeviceTree: React.FC<DeviceTreeProps> = ({ onSelectDevice }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояние для структуры дерева
  const [treeStructure, setTreeStructure] = useState<TreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<{[key: string]: boolean}>({});
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Строит дерево из кодов оборудования
  const buildTreeFromCodes = (devices: Device[]) => {
    const root: TreeNode = {
      id: 'root',
      name: 'Root',
      devices: [],
      children: {}
    };

    devices.forEach(device => {
      const code = device.equipmentCode;
      if (!code) return;
      
      // Разбиваем код на части по дефису
      const parts = code.split('-');
      let currentNode = root;
      
      // Обрабатываем первую часть (может содержать точки)
      if (parts.length > 0 && parts[0]) {
        // Разбиваем первую часть по точкам
        const firstPartSegments = parts[0].split('.');
        
        // Обрабатываем каждый сегмент первой части как отдельный уровень
        let currentPath = '';
        firstPartSegments.forEach((segment, index) => {
          currentPath = currentPath ? `${currentPath}.${segment}` : segment;
          if (!currentNode.children[segment]) {
            currentNode.children[segment] = {
              id: currentPath,
              name: segment,
              devices: [],
              children: {}
            };
          }
          currentNode = currentNode.children[segment];
        });
      }
      
      // Обрабатываем вторую часть (после первого дефиса)
      if (parts.length > 1 && parts[1]) {
        const nodeId = `${parts[0]}-${parts[1]}`;
        if (!currentNode.children[parts[1]]) {
          currentNode.children[parts[1]] = {
            id: nodeId,
            name: parts[1],
            devices: [],
            children: {}
          };
        }
        currentNode = currentNode.children[parts[1]];
      }
      
      // Обрабатываем третью часть (после второго дефиса)
      if (parts.length > 2 && parts[2]) {
        const nodeId = `${parts[0]}-${parts[1]}-${parts[2]}`;
        if (!currentNode.children[parts[2]]) {
          currentNode.children[parts[2]] = {
            id: nodeId,
            name: parts[2],
            devices: [],
            children: {}
          };
        }
        currentNode = currentNode.children[parts[2]];
      }
      
      // Обрабатываем последнюю часть (после третьего дефиса)
      if (parts.length > 3 && parts[3]) {
        // Разбиваем последнюю часть по точкам
        const lastParts = parts[3].split('.');
        
        // Обрабатываем первый сегмент последней части
        const firstSegmentId = `${parts[0]}-${parts[1]}-${parts[2]}-${lastParts[0]}`;
        if (!currentNode.children[lastParts[0]]) {
          currentNode.children[lastParts[0]] = {
            id: firstSegmentId,
            name: lastParts[0],
            devices: [],
            children: {},
            originalDevice: lastParts.length === 1 ? device : undefined
          };
        }
        currentNode = currentNode.children[lastParts[0]];
        
        // Обрабатываем оставшиеся сегменты если есть точки
        if (lastParts.length > 1) {
          for (let i = 1; i < lastParts.length; i++) {
            const segmentId = `${parts[0]}-${parts[1]}-${parts[2]}-${lastParts.slice(0, i + 1).join('.')}`;
            if (!currentNode.children[lastParts[i]]) {
              currentNode.children[lastParts[i]] = {
                id: segmentId,
                name: lastParts[i],
                devices: [],
                children: {},
                originalDevice: i === lastParts.length - 1 ? device : undefined
              };
            }
            currentNode = currentNode.children[lastParts[i]];
          }
        }
      }
      
      // Добавляем устройство к текущему узлу
      currentNode.devices.push(device);
    });
    
    return root;
  };

  // Загрузка данных
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:3001/api/devices/tree');
        console.log('Данные от API:', response.data);
        console.log('Количество устройств:', response.data.length);
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          // Добавляем проверки наличия необходимых полей
          const validDevices = response.data.map(device => ({
            ...device,
            deviceDesignation: device.deviceDesignation || 'Без названия',
            deviceType: device.deviceType || 'Не указан',
            children: Array.isArray(device.children) ? device.children : []
          }));
          
          setDevices(validDevices);
          setFilteredDevices(validDevices);
          
          // Строим древовидную структуру
          const tree = buildTreeFromCodes(validDevices);
          setTreeStructure(tree);
        } else {
          console.error('Получены неверные данные:', response.data);
          setError('Получены некорректные данные от сервера');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке устройств:', err);
        setError('Не удалось загрузить устройства');
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  // Поиск устройств
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredDevices(devices);
      // Перестраиваем дерево с полным набором устройств
      const tree = buildTreeFromCodes(devices);
      setTreeStructure(tree);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();

    // Функция для поиска в устройствах
    const filteredResults = devices.filter(device => 
      device.systemCode.toLowerCase().includes(searchTermLower) ||
      device.equipmentCode.toLowerCase().includes(searchTermLower) ||
      device.deviceDesignation.toLowerCase().includes(searchTermLower) ||
      device.deviceType.toLowerCase().includes(searchTermLower) ||
      (device.description && device.description.toLowerCase().includes(searchTermLower))
    );
    
    setFilteredDevices(filteredResults);
    
    // Перестраиваем дерево с отфильтрованными устройствами
    const tree = buildTreeFromCodes(filteredResults);
    setTreeStructure(tree);
  }, [searchTerm, devices]);

  // Обработка выбора устройства
  const handleSelectDevice = (device: Device) => {
    setSelectedDevice(device);
    onSelectDevice(device);
  };

  // Обработка разворачивания/сворачивания узла
  const handleToggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Рендеринг древовидной структуры
  const renderTreeNode = (node: TreeNode, isRoot = false) => {
    const nodeId = node.id;
    const isExpanded = expandedNodes[nodeId] || false;
    const hasChildren = Object.keys(node.children).length > 0;
    
    // Пропускаем корневой узел
    if (isRoot) {
      return (
        <List sx={{ padding: 0 }}>
          {Object.values(node.children).map(childNode => (
            renderTreeNode(childNode)
          ))}
        </List>
      );
    }
    
    return (
      <React.Fragment key={nodeId}>
        <ListItem 
          sx={{ 
            py: 0.75, 
            cursor: 'pointer',
            borderRadius: '4px',
            mb: 0.5,
            transition: 'all 0.2s ease'
          }}
          className="device-item"
          onClick={() => {
            if (hasChildren) {
              handleToggleNode(nodeId);
            } else if (node.originalDevice) {
              handleSelectDevice(node.originalDevice);
            } else if (node.devices.length === 1) {
              handleSelectDevice(node.devices[0]);
            }
          }}
        >
          {hasChildren ? (
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
              {isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
            </ListItemIcon>
          ) : (
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
              <LinkIcon fontSize="small" />
            </ListItemIcon>
          )}
          <ListItemText 
            primary={node.name} 
            primaryTypographyProps={{ 
              variant: 'body2', 
              sx: { 
                fontWeight: isExpanded ? 600 : 400,
                fontSize: '0.95rem',
                lineHeight: 1.5
              } 
            }}
          />
        </ListItem>
        
        {hasChildren && isExpanded && (
          <List sx={{ pl: 3.5, mt: 0.5, pt: 0, mb: 1 }}>
            {Object.values(node.children).map(childNode => (
              renderTreeNode(childNode)
            ))}
          </List>
        )}
      </React.Fragment>
    );
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (error) {
    return <div>Ошибка: {error}</div>;
  }

  return (
    <Box>
      {/* Поле поиска */}
      <TextField
        fullWidth
        placeholder="Поиск устройств..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        margin="dense"
        variant="outlined"
        size="small"
        className="custom-text-field"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* Сообщение об ошибке */}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Индикатор загрузки */}
      {loading && (
        <Typography sx={{ mb: 2 }}>
          Загрузка устройств...
        </Typography>
      )}

      {/* Древовидная структура */}
      {!loading && !error && treeStructure && (
        <Box sx={{ mt: 2, px: 1 }}>
          {renderTreeNode(treeStructure, true)}
        </Box>
      )}
    </Box>
  );
};

export default DeviceTree; 