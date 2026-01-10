#!/bin/bash

echo "🔄 Перезапуск сервисов АСУ-Оптимизация..."

# Переходим в директорию сервера
cd server

echo "🛠️  Исправление базы данных..."
npm run fix-database

if [ $? -eq 0 ]; then
    echo "✅ База данных исправлена успешно"
else
    echo "❌ Ошибка при исправлении базы данных"
    exit 1
fi

echo "🚀 Запуск сервера..."
npm run dev &
SERVER_PID=$!

# Переходим в директорию клиента
cd ../client

echo "🌐 Запуск клиента..."
npm start &
CLIENT_PID=$!

echo "📋 Сервисы запущены:"
echo "   Сервер (PID: $SERVER_PID): http://localhost:3001"
echo "   Клиент (PID: $CLIENT_PID): http://localhost:3000"
echo ""
echo "Для остановки нажмите Ctrl+C"

# Ожидаем сигнал завершения
trap "echo '🛑 Остановка сервисов...'; kill $SERVER_PID $CLIENT_PID; exit" INT TERM

# Ждем завершения процессов
wait