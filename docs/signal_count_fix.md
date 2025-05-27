# Исправление подсчета сигналов в общей статистике

**Дата:** 27 мая 2025  
**Проблема:** В "Общей статистике по сигналам" не считалось количество сигналов  
**Статус:** ✅ Исправлено  

## 🔍 Анализ проблемы

Пользователь обнаружил, что в разделе "Сигналы" → "Сводная таблица сигналов" → "Общая статистика по сигналам" не отображались корректные значения количества сигналов.

### Причина проблемы:
В SQL запросе контроллера `deviceTypeSignalController.ts` использовалось неправильное имя столбца:
- **Использовалось:** `dr.projectId` 
- **Должно быть:** `dr.project_id`

### Ошибка в логах:
```
SQLITE_ERROR: no such column: dr.projectId
```

## 🛠 Решение

### Исправление SQL запроса

**Файл:** `server/src/controllers/deviceTypeSignalController.ts`

**Было:**
```typescript
// Добавляем фильтрацию по проекту, если указан
if (projectId) {
  signalCountsQuery += ` AND dr.projectId = ${parseInt(projectId as string, 10)}`;
}
```

**Стало:**
```typescript
// Добавляем фильтрацию по проекту, если указан
if (projectId) {
  signalCountsQuery += ` AND dr.project_id = ${parseInt(projectId as string, 10)}`;
}
```

### Объяснение проблемы:

1. **Модель Sequelize** использует `projectId` как имя поля в JavaScript
2. **База данных SQLite** использует `project_id` как имя столбца (snake_case)
3. **Sequelize автоматически преобразует** camelCase в snake_case при работе через ORM
4. **Прямые SQL запросы** требуют использования реальных имен столбцов БД

В модели `DeviceReference.ts` правильно указано:
```typescript
projectId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 1,
  field: 'project_id', // ← Указывает реальное имя столбца в БД
},
```

## ✅ Результат

### До исправления:
- SQL запрос падал с ошибкой `no such column: dr.projectId`
- Общая статистика показывала нулевые значения
- В логах: "Ошибка при выполнении SQL-запроса"

### После исправления:
- SQL запрос выполняется успешно ✅
- Получены корректные данные:
  ```
  { deviceType: 'Насос технологический', signalType: 'AI', total: 2 },
  { deviceType: 'Насос технологический', signalType: 'AO', total: 2 },
  { deviceType: 'Насос технологический', signalType: 'DI', total: 22 },
  { deviceType: 'Насос технологический', signalType: 'DO', total: 10 }
  ```
- Общая статистика отображает правильные значения ✅

## 🧪 Тестирование

### Проверка структуры БД:
```bash
sqlite3 database.sqlite ".schema device_references"
# Результат: столбец называется project_id (не projectId)
```

### Проверка API:
```bash
curl -X GET "http://localhost:3001/api/device-type-signals/summary?projectId=1"
# Результат: корректная сводка с подсчитанными сигналами
```

### Логи сервера:
```
Выполняем запрос для получения количества сигналов...
Получены результаты запроса: [
  { deviceType: 'Насос технологический', signalType: 'AI', total: 2 },
  { deviceType: 'Насос технологический', signalType: 'AO', total: 2 },
  { deviceType: 'Насос технологический', signalType: 'DI', total: 22 },
  { deviceType: 'Насос технологический', signalType: 'DO', total: 10 }
]
```

## 🎯 Ключевые выводы

1. **Различие между ORM и SQL:** При использовании прямых SQL запросов нужно использовать реальные имена столбцов БД
2. **Конвенции именования:** Sequelize автоматически преобразует camelCase в snake_case
3. **Отладка SQL:** Логи помогают быстро выявить проблемы с именами столбцов
4. **Тестирование:** Важно проверять как ORM запросы, так и прямые SQL запросы

Теперь общая статистика по сигналам работает корректно! 🎉 