# Исправление изоляции данных между проектами

**Дата:** 27 мая 2025  
**Проблема:** При переключении между проектами дерево устройств показывало данные из другого проекта  
**Статус:** ✅ Исправлено  

## 🔍 Анализ проблемы

Проблема заключалась в том, что frontend компоненты для управления проектами были созданы, но **существующие компоненты** (DeviceTree, DeviceDetails и др.) не были обновлены для работы с текущим проектом.

### Что происходило:
1. Пользователь выбирал проект "TEST_001" (0 устройств)
2. DeviceTree продолжал загружать **все устройства** из базы данных
3. Отображались устройства из проекта "DEFAULT" (2267 устройств)

## 🛠 Решение

### 1. Обновление Backend API

**Файл:** `server/src/controllers/deviceReferenceController.ts`

Добавлена поддержка параметра `projectId` в методы:
- `getAllDevices()` - фильтрация устройств по проекту
- `getDeviceTree()` - фильтрация дерева устройств по проекту

```typescript
// Формируем условие фильтрации по проекту
const whereCondition: any = {};
if (projectId) {
  whereCondition.projectId = parseInt(projectId as string, 10);
}

const devices = await DeviceReference.findAll({
  where: whereCondition,
  // ... остальные параметры
});
```

### 2. Обновление Frontend API

**Файл:** `client/src/services/api.ts`

Обновлены функции для передачи `projectId`:

```typescript
// Получить все устройства
getAllDevices: async (projectId?: number): Promise<DeviceReference[]> => {
  const params = projectId ? { projectId } : {};
  const response = await api.get('/device-references', { params });
  return response.data;
},

// Получить дерево устройств  
getDeviceTree: async (projectId?: number): Promise<TreeNode[]> => {
  const params = projectId ? { projectId } : {};
  const response = await api.get('/device-references/tree', { params });
  return response.data;
},
```

### 3. Обновление компонента DeviceTree

**Файл:** `client/src/components/DeviceTree.tsx`

Добавлена интеграция с контекстом проектов:

```typescript
// Используем контекст проектов
const { currentProjectId } = useProject();

// Загрузка устройств с учетом проекта
const fetchDevices = useCallback(async () => {
  const data = await deviceService.getAllDevices(currentProjectId || undefined);
  console.log(`Загружены устройства для проекта ${currentProjectId}:`, data.length, 'элементов');
  // ...
}, [buildCustomTreeCallback, currentProjectId]);

// Перезагрузка при смене проекта
useEffect(() => {
  fetchDevices();
}, [updateCounter, fetchDevices, currentProjectId]);
```

## ✅ Результат

### До исправления:
- Проект "TEST_001": показывал 2267 устройств из проекта "DEFAULT"
- Проект "WTP_002": показывал 2267 устройств из проекта "DEFAULT"

### После исправления:
- Проект "DEFAULT": показывает 2267 устройств ✅
- Проект "TEST_001": показывает 0 устройств ✅  
- Проект "WTP_002": показывает 0 устройств ✅

## 🧪 Тестирование

### API тестирование:
```bash
# Проект DEFAULT (ID=1) - 2267 устройств
curl -X GET "http://localhost:3001/api/device-references?projectId=1"

# Проект TEST_001 (ID=2) - 0 устройств  
curl -X GET "http://localhost:3001/api/device-references?projectId=2"
# Результат: []
```

### Frontend тестирование:
1. Открыть http://localhost:3000
2. Переключиться между проектами в селекторе
3. Убедиться, что дерево устройств обновляется корректно

## 📋 Следующие шаги

Аналогично нужно обновить другие компоненты:
- `DeviceDetails` - для отображения деталей устройств текущего проекта
- `SignalManagement` - для работы с сигналами текущего проекта  
- `ImportData` - для импорта данных в текущий проект
- Все остальные компоненты, работающие с устройствами

## 🎯 Ключевые изменения

1. **Backend:** Добавлена фильтрация по `projectId` в SQL запросах
2. **API:** Поддержка параметра `projectId` в HTTP запросах
3. **Frontend:** Интеграция с контекстом проектов
4. **Автообновление:** Перезагрузка данных при смене проекта

Теперь система корректно изолирует данные между проектами! 🎉 