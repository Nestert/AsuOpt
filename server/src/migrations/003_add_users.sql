-- Миграция 003: Добавление пользователей и аутентификации
-- Дата: 2026-01-10
-- Описание: Создание таблицы пользователей для системы аутентификации

-- 1. Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. Создание триггера для автоматического обновления updated_at
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
  AFTER UPDATE ON users
  FOR EACH ROW
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- 4. Создание дефолтного администратора
-- Пароль: admin123 (будет хэширован приложением)
INSERT OR IGNORE INTO users (username, email, password, role, is_active)
VALUES ('admin', 'admin@asuopt.local', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8lWZQjzHq', 'admin', 1);

-- 5. Создание тестового пользователя
INSERT OR IGNORE INTO users (username, email, password, role, is_active)
VALUES ('user', 'user@asuopt.local', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8lWZQjzHq', 'user', 1);