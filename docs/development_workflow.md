# Процесс разработки

1. Установите зависимости для клиента и сервера:

```bash
cd client && npm install
cd ../server && npm install
```

2. Запустите сервер и клиент в отдельных терминалах:

```bash
cd server
npm run dev
```

```bash
cd client
npm start
```

3. Основной код сервера находится в `server/src`, а клиент — в `client/src`.
Используется TypeScript, поэтому для сборки сервера запустите `npm run build` в каталоге `server`.

4. Для импорта или миграции данных предусмотрены скрипты в `server/package.json` (например `import-data`, `migrate-signals`).
