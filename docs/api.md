# Документация API

Сервер предоставляет REST API на порту **3001**. Ниже перечислены основные маршруты.

| Метод | URL | Описание |
| --- | --- | --- |
| `GET` | `/api/devices` | Список всех устройств |
| `GET` | `/api/devices/tree` | Иерархия устройств |
| `GET` | `/api/devices/:id` | Получить устройство по ID |
| `POST` | `/api/devices` | Создать устройство |
| `PUT` | `/api/devices/:id` | Обновить устройство |
| `DELETE` | `/api/devices/:id` | Удалить устройство |
| `GET` | `/api/signals` | Список сигналов |
| `DELETE` | `/api/signals/clear` | Очистить таблицу сигналов |
| `GET` | `/api/device-type-signals` | Сигналы по типам устройств |
| `PUT` | `/api/device-type-signals` | Создать или обновить запись |
| `DELETE` | `/api/device-type-signals/:deviceType` | Удалить запись |
| `POST` | `/api/import/assign-signals/:deviceType?projectId=ID` | Назначить сигналы устройствам указанного типа в проекте |
| `POST` | `/api/import/assign-signals-all?projectId=ID` | Назначить сигналы всем типам устройств в проекте |

Также доступны маршруты для импорта данных (`/api/import`), экспорта (`/api/exports`) и управления проектами (`/api/projects`).
