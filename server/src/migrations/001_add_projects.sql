-- Миграция 001: Добавление мультипроектности
-- Дата: 2025-05-27
-- Описание: Создание таблицы проектов и добавление project_id в существующие таблицы

-- 1. Создание таблицы проектов
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

-- 2. Создание дефолтного проекта для существующих данных
INSERT INTO projects (name, code, description, status) 
VALUES ('Основной проект', 'DEFAULT', 'Проект по умолчанию для существующих данных', 'active');

-- 3. Добавление project_id в существующие таблицы

-- DeviceReference
ALTER TABLE device_references ADD COLUMN project_id INTEGER DEFAULT 1 REFERENCES projects(id);

-- Kips
ALTER TABLE kips ADD COLUMN project_id INTEGER DEFAULT 1 REFERENCES projects(id);

-- Zras  
ALTER TABLE zras ADD COLUMN project_id INTEGER DEFAULT 1 REFERENCES projects(id);

-- Signals
ALTER TABLE signals ADD COLUMN project_id INTEGER DEFAULT 1 REFERENCES projects(id);

-- DeviceTypeSignals
ALTER TABLE device_type_signals ADD COLUMN project_id INTEGER DEFAULT 1 REFERENCES projects(id)

-- 5. Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_device_references_project_id ON device_references(project_id);
CREATE INDEX IF NOT EXISTS idx_kips_project_id ON kips(project_id);
CREATE INDEX IF NOT EXISTS idx_zras_project_id ON zras(project_id);
CREATE INDEX IF NOT EXISTS idx_signals_project_id ON signals(project_id);
CREATE INDEX IF NOT EXISTS idx_device_type_signals_project_id ON device_type_signals(project_id);

-- 6. Создание таблицы шаблонов проектов (для будущего использования)
CREATE TABLE IF NOT EXISTS project_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  template_data TEXT, -- JSON в виде текста для SQLite
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Создание триггеров для автоматического обновления updated_at
CREATE TRIGGER IF NOT EXISTS update_projects_updated_at 
  AFTER UPDATE ON projects
  FOR EACH ROW
  BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_project_templates_updated_at 
  AFTER UPDATE ON project_templates
  FOR EACH ROW
  BEGIN
    UPDATE project_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END; 