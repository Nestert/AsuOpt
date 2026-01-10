-- Миграция 004: Добавление индексов для оптимизации поиска устройств
-- Дата: 2026-01-10
-- Описание: Создание индексов на поля поиска устройств для улучшения производительности

-- Индексы для полей поиска
CREATE INDEX IF NOT EXISTS idx_devices_system_code ON devices(systemCode);
CREATE INDEX IF NOT EXISTS idx_devices_equipment_code ON devices(equipmentCode);
CREATE INDEX IF NOT EXISTS idx_devices_device_designation ON devices(deviceDesignation);
CREATE INDEX IF NOT EXISTS idx_devices_device_type ON devices(deviceType);
CREATE INDEX IF NOT EXISTS idx_devices_description ON devices(description);
CREATE INDEX IF NOT EXISTS idx_devices_parent_id ON devices(parentId);
CREATE INDEX IF NOT EXISTS idx_devices_created_at ON devices(createdAt);
CREATE INDEX IF NOT EXISTS idx_devices_updated_at ON devices(updatedAt);

-- Составной индекс для часто используемых комбинаций
CREATE INDEX IF NOT EXISTS idx_devices_project_system ON devices(project_id, systemCode);
CREATE INDEX IF NOT EXISTS idx_devices_project_type ON devices(project_id, deviceType);