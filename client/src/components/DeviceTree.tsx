import React, { useEffect, useState, useCallback } from 'react';
import { Empty, Input, Spin, Tree, Typography, Button, Dropdown, App } from 'antd';
import {
  FolderOutlined,
  AppstoreOutlined,
  PlusOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { deviceService } from '../services/api';
import { DeviceReference } from '../interfaces/DeviceReference';
import AddDeviceForm from './AddDeviceForm';
import DeviceFilters, { DeviceFiltersInterface as DeviceFiltersType } from './DeviceFilters';
import { useProject } from '../contexts/ProjectContext';

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
  deviceType?: string; // Тип устройства, если это лист
  systemCode?: string; // Код системы, если это лист
  plcType?: string; // Тип ПЛК, если это лист
  exVersion?: string; // Ex-версия, если это лист
  isLeaf?: boolean;
}

const DeviceTree: React.FC<DeviceTreeProps> = ({ onSelectDevice, updateCounter = 0 }) => {
  const [devices, setDevices] = useState<DeviceReference[]>([]);
  const [treeData, setTreeData] = useState<CustomTreeNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<DeviceFiltersType>({});
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddDeviceVisible, setIsAddDeviceVisible] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [filteredDevices, setFilteredDevices] = useState<DeviceReference[]>([]);
  const [isAdvancedFilterVisible, setIsAdvancedFilterVisible] = useState(false);

  // Состояние для контекстного меню
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [rightClickedNode, setRightClickedNode] = useState<any>(null); // Используем any для простоты, можно уточнить тип

  const { message, modal } = App.useApp(); // Добавляем modal для подтверждения удаления
  
  // Используем контекст проектов
  const { currentProjectId } = useProject();

  // Функция для разбиения строки posDesignation на части
  const parsePosDesignation = (posDesignation: string): string[] => {
    // Регулярное выражение для разбиения по разделителям (все, что не буквы и не цифры)
    return posDesignation
      .split(/[^a-zA-Z0-9]+/)
      .filter(part => part.length > 0); // Убираем пустые части
  };

  // Функция построения кастомного дерева
  const buildCustomTreeCallback = useCallback((devices: DeviceReference[]): CustomTreeNode[] => {
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
            childNode.systemCode = device.systemCode || '';
            childNode.plcType = device.plcType || '';
            childNode.exVersion = device.exVersion || '';
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
  }, []);

  // Загрузка устройств
  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await deviceService.getAllDevices(currentProjectId || undefined);
      console.log(`Загружены устройства для проекта ${currentProjectId}:`, data.length, 'элементов');
      
      // Отладочный вывод для проверки значений полей
      const systemCodesDebug = data.map(device => device.systemCode).filter(Boolean);
      const plcTypesDebug = data.map(device => device.plcType).filter(Boolean);
      const exVersionsDebug = data.map(device => device.exVersion).filter(Boolean);
      
      console.log('DEBUG системы:', systemCodesDebug);
      console.log('DEBUG типы ПЛК:', plcTypesDebug);
      console.log('DEBUG Ex-версии:', exVersionsDebug);
      
      setDevices(data);
      setFilteredDevices(data);
      
      const customTree = buildCustomTreeCallback(data);
      setTreeData(customTree);
    } catch (err) {
      console.error('Ошибка при загрузке устройств:', err);
      setError('Не удалось загрузить устройства');
    } finally {
      setLoading(false);
    }
  }, [buildCustomTreeCallback, currentProjectId]);

  // Загрузка данных при монтировании и при изменении updateCounter или проекта
  useEffect(() => {
    fetchDevices();
  }, [updateCounter, fetchDevices, currentProjectId]);

  // Эффект для фильтрации устройств при изменении фильтров
  useEffect(() => {
    if (!devices || devices.length === 0) return;
    
    // Получаем исходные устройства
    let filtered = [...devices];
    
    // Проверяем наличие текстового поиска
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter(device => 
        device.posDesignation.toLowerCase().includes(searchLower) || 
        (device.description && device.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Применяем расширенные фильтры
    if (Object.keys(advancedFilters).length > 0) {
      // Фильтрация по типу устройства
      if (advancedFilters.deviceType && advancedFilters.deviceType.length > 0) {
        filtered = filtered.filter(device => 
          device.deviceType && advancedFilters.deviceType?.includes(device.deviceType)
        );
      }
      
      // Фильтрация по коду системы
      if (advancedFilters.systemCode && advancedFilters.systemCode.length > 0) {
        filtered = filtered.filter(device => 
          (device.systemCode && advancedFilters.systemCode?.includes(device.systemCode)) ||
          (device.parentSystem && advancedFilters.systemCode?.includes(device.parentSystem))
        );
      }
      
      // Фильтрация по типу ПЛК
      if (advancedFilters.plcType && advancedFilters.plcType.length > 0) {
        filtered = filtered.filter(device => {
          // Проверяем совпадение с plcType в основном объекте
          if (device.plcType && advancedFilters.plcType?.includes(device.plcType)) return true;
          
          // Дополнительная проверка: устройство может содержать скрытое поле с данными kip или zra
          // @ts-ignore (игнорируем отсутствие типизации для этих полей)
          const kipPlc = device.kip?.plc;
          // @ts-ignore
          const zraPlc = device.zra?.plc;
          
          return (kipPlc && advancedFilters.plcType?.includes(kipPlc)) || 
                 (zraPlc && advancedFilters.plcType?.includes(zraPlc));
        });
      }
      
      // Фильтрация по Ex-версии
      if (advancedFilters.exVersion && advancedFilters.exVersion.length > 0) {
        filtered = filtered.filter(device => {
          // Проверяем совпадение с exVersion в основном объекте
          if (device.exVersion && advancedFilters.exVersion?.includes(device.exVersion)) return true;
          
          // Дополнительная проверка: устройство может содержать скрытое поле с данными kip или zra
          // @ts-ignore (игнорируем отсутствие типизации для этих полей)
          const kipExVersion = device.kip?.exVersion;
          // @ts-ignore
          const zraExVersion = device.zra?.exVersion;
          
          return (kipExVersion && advancedFilters.exVersion?.includes(kipExVersion)) || 
                 (zraExVersion && advancedFilters.exVersion?.includes(zraExVersion));
        });
      }
      
      // Фильтрация по обозначению позиции (posDesignation)
      if (advancedFilters.posDesignation) {
        const posSearchLower = advancedFilters.posDesignation.toLowerCase();
        filtered = filtered.filter(device => 
          device.posDesignation.toLowerCase().includes(posSearchLower)
        );
      }
      
      // Фильтрация по описанию (description)
      if (advancedFilters.description) {
        const descSearchLower = advancedFilters.description.toLowerCase();
        filtered = filtered.filter(device => 
          device.description && device.description.toLowerCase().includes(descSearchLower)
        );
      }
      
      // Фильтрация по типу данных
      if (advancedFilters.dataType && advancedFilters.dataType.length > 0) {
        filtered = filtered.filter(device => {
          // @ts-ignore
          const hasKip = Boolean(device.kip);
          // @ts-ignore
          const hasZra = Boolean(device.zra);
          
          const dataType = hasKip ? 'kip' : (hasZra ? 'zra' : 'unknown');
          
          return advancedFilters.dataType?.includes(dataType);
        });
      }
      
      // Дополнительные фильтры для полей КИП
      if (advancedFilters.section && advancedFilters.section.length > 0) {
        filtered = filtered.filter(device => {
          // @ts-ignore
          const section = device.kip?.section;
          return section && advancedFilters.section?.includes(section);
        });
      }
      
      // Здесь можно добавить дополнительные фильтры для других полей КИП и ЗРА
    }
    
    // Отладочный вывод
    console.log('Активные фильтры:', advancedFilters);
    console.log('Отфильтрованные устройства:', filtered.length);
    
    // Обновляем дерево с отфильтрованными устройствами
    const customTree = buildCustomTreeCallback(filtered);
    
    setFilteredDevices(filtered);
    setTreeData(customTree);
    
    // Сбрасываем развернутые узлы при изменении фильтра
    setExpandedKeys([]);
    setAutoExpandParent(false);
    setIsAdvancedFilterVisible(false);
  }, [advancedFilters, searchValue, devices, buildCustomTreeCallback]);

  // Обработчик применения расширенных фильтров
  const handleApplyFilters = (filters: DeviceFiltersType) => {
    setAdvancedFilters(filters);
  };

  // Поиск в дерева устройств
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

  // Обработчик выбора узла в дереве
  const onSelect = (selectedKeys: React.Key[], info: any) => {
    const { node } = info;
    console.log('Выбран узел:', node);

    // --- Логика раскрытия/сворачивания при клике на имя узла --- 
    if (node && !node.isLeaf) { // Проверяем, что это не лист
      const currentKey = node.key;
      const isExpanded = expandedKeys.includes(currentKey);
      let newExpandedKeys;

      if (isExpanded) {
        // Сворачиваем узел
        newExpandedKeys = expandedKeys.filter(key => key !== currentKey);
        console.log(`Сворачиваем узел ${currentKey}`);
      } else {
        // Раскрываем узел
        newExpandedKeys = [...expandedKeys, currentKey];
        console.log(`Раскрываем узел ${currentKey}`);
      }
      setExpandedKeys(newExpandedKeys);
      setAutoExpandParent(false); // Важно при ручном управлении раскрытием
    }
    // --- Конец логики раскрытия/сворачивания --- 

    // Оригинальная логика выбора узла (для отображения деталей)
    if (node.isLeaf && node.originalId) {
      onSelectDevice(node.originalId);
      // Сохраняем ID выбранного устройства как потенциального родителя
      setSelectedParentId(node.originalId);
    } else {
      console.log('onSelect: выбран не лист дерева, действие не требуется');
      setSelectedParentId(null);
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

  // Обработчик переключения видимости расширенных фильтров
  const toggleAdvancedFilters = () => {
    setIsAdvancedFilterVisible(!isAdvancedFilterVisible);
  };

  // Обработчик правого клика по узлу дерева
  const onRightClick = ({ event, node }: { event: React.MouseEvent, node: any }) => {
    event.preventDefault(); // Предотвращаем стандартное контекстное меню браузера
    console.log('Right clicked node:', node);
    setRightClickedNode(node); // Сохраняем данные узла
    setContextMenuPosition({ x: event.clientX, y: event.clientY }); // Сохраняем координаты
    setContextMenuVisible(true); // Показываем меню
  };

  // Скрытие контекстного меню при клике в другом месте
  useEffect(() => {
    const handleClickOutside = () => setContextMenuVisible(false);
    if (contextMenuVisible) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenuVisible]);

  // --- Функции для действий контекстного меню ---

  const handleMenuClick = (e: { key: string }) => {
    setContextMenuVisible(false); // Скрываем меню после клика
    if (!rightClickedNode) return;

    const nodeId = rightClickedNode.originalId;

    switch (e.key) {
      case 'edit':
        if (nodeId) {
          console.log('Контекстное меню: Редактировать узел', nodeId);
          // Выбираем узел, чтобы показать детали
          onSelect([], { node: rightClickedNode }); // Передаем узел в info
          // TODO: Потенциально добавить сигнал для DeviceDetails, чтобы перейти в режим редактирования
        }
        break;
      case 'delete':
        if (nodeId) {
          console.log('Контекстное меню: Удалить узел', nodeId);
          modal.confirm({
            title: 'Подтвердите удаление',
            content: `Вы уверены, что хотите удалить устройство "${rightClickedNode.title?.props?.children?.join ? rightClickedNode.title.props.children.join('') : rightClickedNode.title}"?`, // Получаем текст из title
            okText: 'Удалить',
            okType: 'danger',
            cancelText: 'Отмена',
            onOk: async () => {
              try {
                await deviceService.deleteDeviceById(nodeId);
                message.success('Устройство успешно удалено');
                fetchDevices(); // Обновляем дерево
              } catch (err) {
                console.error('Ошибка при удалении устройства:', err);
                message.error('Не удалось удалить устройство');
              }
            },
          });
        }
        break;
      case 'addChild':
        if (nodeId) {
          console.log('Контекстное меню: Добавить дочерний элемент для', nodeId);
          setSelectedParentId(nodeId);
          showAddDeviceForm();
        } else {
          // Если кликнули не на лист (а на папку), parentId будет null
          setSelectedParentId(null);
          showAddDeviceForm();
        }
        break;
      default:
        break;
    }
  };

  // Формирование элементов меню
  const getMenuItems = () => {
    const items = [];
    const isLeaf = rightClickedNode?.isLeaf;
    
    if (isLeaf) {
        items.push({ key: 'edit', label: 'Редактировать' });
        items.push({ key: 'delete', label: 'Удалить', danger: true });
        items.push({ key: 'addChild', label: 'Добавить дочерний' });
    } else {
        // Для папок можно добавить только дочерний элемент
        items.push({ key: 'addChild', label: 'Добавить устройство сюда' });
    }
    
    return items;
  };

  // --- Рендеринг ---

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
    // Добавляем стили flexbox для основного контейнера
    <div className="device-tree-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}> 
      <div className="device-tree-header" style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        alignItems: 'center', 
        marginBottom: '16px',
        gap: '8px'
      }}>
        <Input.Search
          placeholder="Поиск по обозначению или описанию"
          onChange={e => handleSearch(e.target.value)}
          value={searchValue}
          style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}
          size="middle"
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            type="primary" 
            icon={<FilterOutlined />} 
            onClick={toggleAdvancedFilters}
            style={{ minWidth: '140px' }}
            size="middle"
          >
            Фильтры
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={showAddDeviceForm}
            style={{ minWidth: '120px' }}
            size="middle"
          >
            Добавить
          </Button>
        </div>
      </div>

      {isAdvancedFilterVisible && (
        <div style={{ marginBottom: '16px' }}>
          <DeviceFilters 
            onApplyFilters={handleApplyFilters} 
            devices={devices}
            loading={loading}
          />
        </div>
      )}
      
      {/* Контейнер для дерева или сообщения Empty */}
      <div style={{ 
          flex: 1, // Занимать всё оставшееся пространство
          minHeight: 0, // Важно для flex item
          display: 'flex', // Используем flex для центрирования Empty
          flexDirection: 'column' // Элементы внутри (рамка/Empty) идут друг за другом
      }}>
        {filteredDevices.length > 0 ? (
          <div style={{ 
            // Убираем фиксированную высоту, добавляем flex: 1
            flex: 1,
            minHeight: 0, // Добавляем и сюда на всякий случай
            overflow: 'auto', 
            border: '1px solid #f0f0f0',
            borderRadius: '4px',
            padding: '8px',
            backgroundColor: '#fafafa'
          }}>
            {/* Оборачиваем Tree в Dropdown */} 
            <Dropdown
              menu={{ items: getMenuItems(), onClick: handleMenuClick }}
              trigger={['contextMenu']}
              open={contextMenuVisible}
              onOpenChange={setContextMenuVisible}
              // Используем dropdownRender для позиционирования по координатам мыши
              dropdownRender={menu => (
                <div style={{ 
                    position: 'fixed',
                    left: contextMenuPosition.x,
                    top: contextMenuPosition.y,
                 }}>
                  {menu}
                </div>
              )}
            >
              {/* Пустой div нужен, чтобы Dropdown корректно отлавливал событие contextMenu */}
              {/* На саму Tree вешаем onRightClick для получения координат */}
              <div> 
                <Tree
                  showIcon
                  expandedKeys={expandedKeys}
                  autoExpandParent={autoExpandParent}
                  onExpand={onExpand}
                  onSelect={onSelect}
                  treeData={processTreeData(treeData)}
                  style={{ backgroundColor: '#fff' }}
                  onRightClick={onRightClick} // Этот обработчик получает координаты и данные узла
                />
              </div>
            </Dropdown>
          </div>
        ) : (
          // Оборачиваем Empty для центрирования в flex-контейнере
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}> 
            <Empty description="Устройства не найдены" />
          </div>
        )}
      </div>

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