# АСУ ТП - Система управления устройствами

Веб-приложение для ведения списков устройств АСУ ТП и генерации документации. Позволяет организовывать устройства в иерархическую структуру, редактировать их параметры и экспортировать данные в Excel.

## Основные возможности

- Отображение устройств в виде древовидной структуры
- Добавление, редактирование и удаление устройств
- Поиск по параметрам устройств
- Экспорт данных в Excel (опционально: Word, PDF)
- Иерархическая структура устройств (родитель-потомок)

## Технологии

- **Фронтенд**: React, Material-UI
- **Бэкенд**: Node.js, Express
- **База данных**: SQLite
- **Дополнительно**: Sequelize, ExcelJS

## Установка и запуск

### Требования
- Node.js v14+
- npm v6+

### Установка зависимостей

```bash
# Установка зависимостей клиента
cd client
npm install

# Установка зависимостей сервера
cd ../server
npm install
```

### Запуск приложения

```bash
# Запуск сервера
cd server
npm run dev

# Запуск клиента (в отдельном терминале)
cd client
npm start
```

После запуска:
- Клиент будет доступен по адресу: http://localhost:3000
- Сервер API будет работать на: http://localhost:3001

## Структура данных

Основная таблица `Devices` описана в файле `docs/database.md`.

## Документация

Подробная техническая документация находится в директории `docs/`:

*   [Архитектура приложения](docs/architecture.md)
*   [Структура Базы Данных](docs/database.md)
*   [Процесс Разработки](docs/development_workflow.md)
*   [Документация API](docs/api.md) (Рекомендуется использовать Swagger/OpenAPI)

## Разработка

Проект находится в стадии MVP (Minimum Viable Product). Планируется дальнейшее развитие с добавлением новых функций, таких как:
- Экспорт в Word и PDF
- Пользовательское управление и аутентификация
- Улучшенные возможности поиска и фильтрации
- Интеграция с внешними системами 