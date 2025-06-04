-- Миграция 002: создание таблицы signal_types
CREATE TABLE IF NOT EXISTS signal_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Базовые типы сигналов
INSERT OR IGNORE INTO signal_types (code, name, description, category)
VALUES
  ('AI', 'Аналоговый вход', 'Стандартный аналоговый вход', 'analog'),
  ('AO', 'Аналоговый выход', 'Стандартный аналоговый выход', 'analog'),
  ('DI', 'Дискретный вход', 'Стандартный дискретный вход', 'digital'),
  ('DO', 'Дискретный выход', 'Стандартный дискретный выход', 'digital');

-- Триггер для обновления updated_at
CREATE TRIGGER IF NOT EXISTS trg_signal_types_updated_at
AFTER UPDATE ON signal_types
FOR EACH ROW
BEGIN
  UPDATE signal_types SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
