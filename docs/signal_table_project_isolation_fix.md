# Исправление изоляции таблицы сигналов по проектам

**Дата:** 27 мая 2025  
**Проблема:** Во вкладке "Сигналы" → "Сводная таблица сигналов" отображались данные из всех проектов  
**Статус:** ✅ Исправлено  

## 🔍 Анализ проблемы

Пользователь обнаружил, что во вкладке "Сигналы" все еще отображались сигналы в пустом проекте. При детальном анализе выяснилось, что проблема была в компоненте `SignalTable`, который использует API `deviceTypeSignalService`, а не `signalService`.

### Что происходило:
1. Компонент `SignalTable` использует API `/api/device-type-signals/*`
2. Эти API не были обновлены для поддержки фильтрации по проекту
3. В результате отображались данные из всех проектов

## 🛠 Решение

### 1. Обновление Backend API

**Файл:** `server/src/controllers/deviceTypeSignalController.ts`

#### Метод `getUniqueDeviceTypesFromReference()`
Добавлена поддержка фильтрации по проекту:

```typescript
export const getUniqueDeviceTypesFromReference = async (req: Request, res: Response) => {
  const { projectId } = req.query;
  console.log(`Вызов метода getUniqueDeviceTypesFromReference для проекта ${projectId || 'все'}`);
  
  // Формируем условие фильтрации по проекту
  const whereCondition: any = {
    deviceType: {
      [Op.not]: null,
      [Op.ne]: ''
    }
  };
  
  if (projectId) {
    whereCondition.projectId = parseInt(projectId as string, 10);
  }
  
  const deviceReferences = await DeviceReference.findAll({
    attributes: ['deviceType'],
    where: whereCondition,
    group: ['deviceType'],
    order: [['deviceType', 'ASC']]
  });
  
  // Если типов устройств нет и не указан проект, создаем тестовые данные
  if (deviceTypes.length === 0 && !projectId) {
    // ... логика создания тестовых данных
  }
};
```

#### Метод `getSignalsSummary()`
Добавлена фильтрация по проекту с учетом архитектурных особенностей:

```typescript
export const getSignalsSummary = async (req: Request, res: Response) => {
  const { projectId } = req.query;
  
  // DeviceTypeSignal не связана с проектами, получаем все записи
  const deviceTypeSignals = await DeviceTypeSignal.findAll({
    order: [['deviceType', 'ASC']]
  });
  
  // Получаем число устройств для каждого типа из DeviceReference с фильтрацией по проекту
  const deviceCountWhere: any = {
    deviceType: { [Op.not]: null, [Op.ne]: '' }
  };
  
  if (projectId) {
    deviceCountWhere.projectId = parseInt(projectId as string, 10);
  }
  
  const deviceTypeCounts = await DeviceReference.findAll({
    attributes: ['deviceType', [DeviceReference.sequelize!.fn('COUNT', DeviceReference.sequelize!.col('id')), 'count']],
    where: deviceCountWhere,
    group: ['deviceType']
  });
  
  // Фильтруем DeviceTypeSignal только по типам устройств текущего проекта
  const projectDeviceTypes = Object.keys(deviceCounts);
  const filteredDeviceTypeSignals = projectId 
    ? deviceTypeSignals.filter(dts => projectDeviceTypes.includes(dts.deviceType))
    : deviceTypeSignals;
};
```

#### Обновление SQL запроса
Изменен запрос для получения сигналов с учетом проекта:

```sql
-- Было:
SELECT d.deviceType as deviceType, s.type as signalType, SUM(ds.count) as total
FROM device_signals ds
JOIN devices d ON ds.deviceId = d.id
JOIN signals s ON ds.signalId = s.id
WHERE d.deviceType IS NOT NULL AND d.deviceType != ''
GROUP BY d.deviceType, s.type

-- Стало:
SELECT dr.deviceType as deviceType, s.type as signalType, SUM(ds.count) as total
FROM device_signals ds
JOIN device_references dr ON ds.deviceId = dr.id
JOIN signals s ON ds.signalId = s.id
WHERE dr.deviceType IS NOT NULL AND dr.deviceType != ''
AND dr.projectId = ${projectId}  -- если указан проект
GROUP BY dr.deviceType, s.type
```

### 2. Обновление Frontend API

**Файл:** `client/src/services/api.ts`

Обновлены методы `deviceTypeSignalService`:

```typescript
// Получить список уникальных типов устройств из справочника DeviceReference
getUniqueDeviceTypesFromReference: async (projectId?: number): Promise<string[]> => {
  const params = projectId ? { projectId } : {};
  const response = await api.get('/device-type-signals/unique-device-types-reference', { params });
  return response.data;
},

// Получить сводную таблицу сигналов
getSignalsSummary: async (projectId?: number): Promise<SignalsSummary> => {
  const params = projectId ? { projectId } : {};
  const response = await api.get('/device-type-signals/summary', { params });
  return response.data;
},
```

### 3. Обновление Frontend компонента

**Файл:** `client/src/components/SignalTable.tsx`

Добавлена передача `projectId` в API вызовы:

```typescript
const fetchData = useCallback(async () => {
  // Загружаем список всех типов устройств из DeviceReference
  const typesFromReference = await deviceTypeSignalService.getUniqueDeviceTypesFromReference(projectId || undefined);
  
  // Загружаем сводную таблицу существующих записей
  const summaryData = await deviceTypeSignalService.getSignalsSummary(projectId || undefined);
  
  // ...
}, [autoFillEnabled, addMissingTypes, projectId]);
```

## ✅ Результат

### До исправления:
- Проект "TEST_001": показывал сводную таблицу со всеми типами устройств
- Проект "WTP_002": показывал сводную таблицу со всеми типами устройств

### После исправления:
- Проект "DEFAULT": показывает полную сводную таблицу ✅
- Проект "TEST_001": показывает пустую сводную таблицу ✅  
- Проект "WTP_002": показывает пустую сводную таблицу ✅

## 🧪 Тестирование

### API тестирование:
```bash
# Типы устройств для проекта DEFAULT
curl -X GET "http://localhost:3001/api/device-type-signals/unique-device-types-reference?projectId=1"
# Результат: [32 типа устройств]

# Типы устройств для пустого проекта
curl -X GET "http://localhost:3001/api/device-type-signals/unique-device-types-reference?projectId=2"
# Результат: []

# Сводка для проекта DEFAULT
curl -X GET "http://localhost:3001/api/device-type-signals/summary?projectId=1"
# Результат: {"deviceTypeSignals":[...32 записи...], "summary":{"totalDevices":2267}}

# Сводка для пустого проекта
curl -X GET "http://localhost:3001/api/device-type-signals/summary?projectId=2"
# Результат: {"deviceTypeSignals":[], "summary":{"totalAI":0,"totalAO":0,"totalDI":0,"totalDO":0,"totalSignals":0,"totalDevices":0}}
```

### Frontend тестирование:
1. Открыть http://localhost:3000
2. Перейти на вкладку "Управление сигналами" → "Сводная таблица сигналов"
3. Переключиться между проектами в селекторе
4. Убедиться, что таблица обновляется корректно

## 📋 Архитектурные особенности

### Проблема архитектуры:
1. **Таблица `device_type_signals` не связана с проектами** - она содержит общие настройки типов сигналов
2. **Фильтрация через `device_references`** - используется связь устройств с проектами
3. **Двухэтапная фильтрация** - сначала получаем типы устройств проекта, затем фильтруем сводку

### Решение:
- Сохранили существующую архитектуру таблицы `device_type_signals`
- Добавили логику фильтрации на уровне контроллера
- Используем `device_references` как источник истины для проектов

## 🎯 Ключевые изменения

1. **Backend:** Фильтрация через связанные устройства проекта
2. **API:** Поддержка параметра `projectId` в HTTP запросах
3. **Frontend:** Передача `projectId` в API вызовы
4. **SQL:** Обновление запросов для использования `device_references`
5. **Логика:** Двухэтапная фильтрация для сохранения архитектуры

Теперь все компоненты сигналов корректно изолированы между проектами! 🎉 