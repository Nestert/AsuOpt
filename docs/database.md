# Структура базы данных

Проект использует SQLite и ORM Sequelize. Основные модели расположены в `server/src/models`.

## Таблица `devices`

Хранит информацию об устройствах и их иерархии.

| Поле | Тип | Описание |
| --- | --- | --- |
| `id` | INTEGER | Первичный ключ |
| `systemCode` | STRING | Код системы |
| `equipmentCode` | STRING | Код оборудования |
| `lineNumber` | STRING | Номер линии |
| `cabinetName` | STRING | Наименование шкафа |
| `deviceDesignation` | STRING | Позиционное обозначение |
| `deviceType` | STRING | Тип устройства |
| `description` | TEXT | Описание |
| `parentId` | INTEGER | Ссылка на родительское устройство |

## Таблица `device_signals`

Связывает устройства и сигналы.

| Поле | Тип | Описание |
| --- | --- | --- |
| `id` | INTEGER | Первичный ключ |
| `deviceId` | INTEGER | Идентификатор устройства |
| `signalId` | INTEGER | Идентификатор сигнала |
| `count` | INTEGER | Количество сигналов |

## Таблица `signals`

Справочник сигналов (AI, AO, DI, DO).

## Таблица `device_type_signals`

Количество сигналов для разных типов устройств.

## Другие таблицы

В папке моделей также определены `DeviceReference`, `Kip`, `Zra`, `Project` и другие, используемые для импорта данных и управления проектами.
