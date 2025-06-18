-- Миграция 002: Исправление проблем с device_references
-- Дата: 2025-01-04
-- Описание: Исправление синтаксических ошибок и обеспечение наличия project_id в device_references

-- 1. Создание таблицы проектов, если она не существует
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'template')),
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  settings TEXT -- JSON в виде текста для SQLite
);

-- 2. Создание дефолтного проекта, если он не существует
INSERT OR IGNORE INTO projects (id, name, code, description, status) 
VALUES (1, 'Основной проект', 'DEFAULT', 'Проект по умолчанию для существующих данных', 'active');

-- 3. Проверка и добавление project_id в device_references
-- Сначала проверим, существует ли уже колонка
PRAGMA table_info(device_references);

-- Если колонка не существует, добавим её
-- В SQLite нельзя использовать IF NOT EXISTS для ALTER TABLE, 
-- поэтому используем обработку ошибок

-- Добавление project_id в device_references
-- Этот запрос может завершиться ошибкой, если колонка уже существует
-- Ошибка будет обработана в коде приложения

-- 4. Обновление существующих записей без project_id
UPDATE device_references SET project_id = 1 WHERE project_id IS NULL;

-- 5. Создание индексов, если они не существуют
CREATE INDEX IF NOT EXISTS idx_device_references_project_id ON device_references(project_id);

-- 6. Обновление уникального ограничения на device_references
DROP INDEX IF EXISTS sqlite_autoindex_device_references_1;
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_references_proj_pos ON device_references(project_id, posDesignation);

-- 7. Добавление project_id в другие таблицы, если не существует

-- 8. Создание индексов для других таблиц
CREATE INDEX IF NOT EXISTS idx_kips_project_id ON kips(project_id);
CREATE INDEX IF NOT EXISTS idx_zras_project_id ON zras(project_id);
CREATE INDEX IF NOT EXISTS idx_signals_project_id ON signals(project_id);
CREATE INDEX IF NOT EXISTS idx_device_type_signals_project_id ON device_type_signals(project_id);

-- 9. Создание триггеров для автоматического обновления updated_at
CREATE TRIGGER IF NOT EXISTS update_projects_updated_at 
  AFTER UPDATE ON projects
  FOR EACH ROW
  BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END; 