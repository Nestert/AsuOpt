# Реализация изоляции сигналов по проектам

**Дата:** 27 мая 2025  
**Проблема:** Таблица сигналов показывала данные из всех проектов, не учитывая текущий выбранный проект  
**Статус:** ✅ Исправлено  

## 🔍 Анализ проблемы

Аналогично проблеме с устройствами, компоненты управления сигналами не были интегрированы с системой проектов:

### Что происходило:
1. Пользователь выбирал проект "TEST_001" (0 устройств)
2. Таблица сигналов показывала **все сигналы** из всех проектов
3. Отображались сигналы из проекта "DEFAULT" (18 сигналов)

## 🛠 Решение

### 1. Обновление Backend API

**Файл:** `server/src/controllers/signalController.ts`

#### Метод `getAllSignals()`
Добавлена фильтрация сигналов через связанные устройства:

```typescript
export const getAllSignals = async (req: Request, res: Response) => {
  const { projectId } = req.query;
  
  if (projectId) {
    // Получаем только сигналы, связанные с устройствами этого проекта
    const signals = await Signal.findAll({
      include: [
        {
          model: DeviceSignal,
          as: 'deviceSignals',
          required: true, // INNER JOIN
          include: [
            {
              model: DeviceReference,
              as: 'deviceReference',
              where: { projectId: parseInt(projectId as string, 10) },
              required: true
            }
          ]
        }
      ],
      order: [['type', 'ASC'], ['name', 'ASC']]
    });
    
    // Убираем дубликаты сигналов
    const uniqueSignals = signals.filter((signal, index, self) => 
      index === self.findIndex(s => s.id === signal.id)
    );
    
    return res.status(200).json(uniqueSignals);
  }
  // ... остальная логика
};
```

#### Метод `getSignalsSummary()`
Добавлена фильтрация сводки по проекту:

```typescript
export const getSignalsSummary = async (req: Request, res: Response) => {
  const { projectId } = req.query;
  
  if (projectId) {
    const signalsByType = await Signal.findAll({
      attributes: [
        'type', 
        [Sequelize.fn('SUM', Sequelize.col('deviceSignals.count')), 'totalCount']
      ],
      include: [
        {
          model: DeviceSignal,
          as: 'deviceSignals',
          attributes: [],
          required: true,
          include: [
            {
              model: DeviceReference,
              as: 'deviceReference',
              attributes: [],
              where: { projectId: parseInt(projectId as string, 10) },
              required: true
            }
          ]
        }
      ],
      group: ['Signal.type'],
      order: [['type', 'ASC']]
    });
    
    return res.status(200).json(signalsByType);
  }
  // ... остальная логика
};
```

### 2. Обновление связей моделей

**Файл:** `server/src/models/DeviceSignal.ts`

Добавлена связь с DeviceReference для фильтрации по проекту:

```typescript
public static associate(): void {
  // Существующие связи
  DeviceSignal.belongsTo(Device, {
    foreignKey: 'deviceId',
    as: 'device',
  });
  
  DeviceSignal.belongsTo(Signal, {
    foreignKey: 'signalId',
    as: 'signal',
  });
  
  // Новая связь с DeviceReference для фильтрации по проекту
  DeviceSignal.belongsTo(DeviceReference, {
    foreignKey: 'deviceId',
    as: 'deviceReference',
  });
}
```

**Файл:** `server/src/models/Signal.ts`

Добавлена обратная связь с DeviceSignal:

```typescript
public static associate(): void {
  const { DeviceSignal } = require('./DeviceSignal');
  Signal.hasMany(DeviceSignal, {
    foreignKey: 'signalId',
    as: 'deviceSignals',
  });
}
```

### 3. Обновление Frontend API

**Файл:** `client/src/services/api.ts`

Обновлены функции для передачи `projectId`:

```typescript
// Получить все сигналы
getAllSignals: async (projectId?: number): Promise<Signal[]> => {
  const params = projectId ? { projectId } : {};
  const response = await api.get('/signals', { params });
  return response.data;
},

// Получить сводку по сигналам  
getSignalsSummary: async (projectId?: number): Promise<SignalSummary[]> => {
  const params = projectId ? { projectId } : {};
  const response = await api.get('/signals/summary', { params });
  return response.data;
},
```

### 4. Обновление Frontend компонентов

#### SignalManagement
Добавлена интеграция с контекстом проектов:

```typescript
const SignalManagement: React.FC = () => {
  const { currentProjectId } = useProject();
  
  return (
    <Tabs items={[
      {
        key: 'summary',
        label: 'Сводная таблица сигналов',
        children: <SignalTable projectId={currentProjectId} />
      },
      {
        key: 'definitions', 
        label: 'Типы сигналов',
        children: <SignalDefinitions projectId={currentProjectId} />
      },
      {
        key: 'export',
        label: 'Экспорт сигналов',
        children: <SignalExport projectId={currentProjectId} />
      }
    ]} />
  );
};
```

#### SignalTable, SignalDefinitions, SignalExport
Все компоненты обновлены для поддержки `projectId`:

```typescript
interface SignalTableProps {
  projectId?: number | null;
}

const SignalTable: React.FC<SignalTableProps> = ({ projectId }) => {
  // Использование projectId в API вызовах
};
```

## ✅ Результат

### До исправления:
- Проект "TEST_001": показывал 18 сигналов из проекта "DEFAULT"
- Проект "WTP_002": показывал 18 сигналов из проекта "DEFAULT"

### После исправления:
- Проект "DEFAULT": показывает 18 сигналов ✅
- Проект "TEST_001": показывает 0 сигналов ✅  
- Проект "WTP_002": показывает 0 сигналов ✅

## 🧪 Тестирование

### API тестирование:
```bash
# Проект DEFAULT (ID=1) - 18 сигналов
curl -X GET "http://localhost:3001/api/signals?projectId=1"
# Результат: [18 сигналов]

# Проект TEST_001 (ID=2) - 0 сигналов  
curl -X GET "http://localhost:3001/api/signals?projectId=2"
# Результат: []

# Сводка для проекта DEFAULT
curl -X GET "http://localhost:3001/api/signals/summary?projectId=1"
# Результат: [{"type":"AI","totalCount":1},{"type":"AO","totalCount":1},{"type":"DI","totalCount":11},{"type":"DO","totalCount":5}]

# Сводка для пустого проекта
curl -X GET "http://localhost:3001/api/signals/summary?projectId=2"
# Результат: []
```

### Frontend тестирование:
1. Открыть http://localhost:3000
2. Перейти на вкладку "Управление сигналами"
3. Переключиться между проектами в селекторе
4. Убедиться, что таблицы сигналов обновляются корректно

## 📋 Архитектурные особенности

### Логика фильтрации:
1. **Сигналы не имеют прямой связи с проектами** - они связаны через устройства
2. **Фильтрация через DeviceSignal** - используется промежуточная таблица связей
3. **Убирание дубликатов** - один сигнал может использоваться несколькими устройствами
4. **Сохранение обратной совместимости** - без projectId возвращаются все сигналы

### Производительность:
- Используются INNER JOIN для эффективной фильтрации
- Группировка на уровне SQL для сводных данных
- Минимальное количество запросов к БД

## 🎯 Ключевые изменения

1. **Backend:** Фильтрация сигналов через связанные устройства проекта
2. **Модели:** Добавлены связи DeviceSignal ↔ DeviceReference
3. **API:** Поддержка параметра `projectId` в HTTP запросах
4. **Frontend:** Интеграция всех компонентов сигналов с контекстом проектов
5. **Автообновление:** Перезагрузка данных при смене проекта

Теперь система корректно изолирует сигналы между проектами! 🎉 