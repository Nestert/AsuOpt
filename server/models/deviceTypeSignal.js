const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Модель для хранения сигналов для типов устройств
const DeviceTypeSignal = sequelize.define('DeviceTypeSignal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  deviceType: {
    type: DataTypes.STRING,
    allowNull: false,
    // Каждый тип устройства должен быть уникален
    unique: true,
    // Идентификатор для этого поля
    field: 'device_type',
  },
  aiCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'ai_count',
  },
  aoCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'ao_count',
  },
  diCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'di_count',
  },
  doCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'do_count',
  },
}, {
  tableName: 'device_type_signals',
  timestamps: true,
  underscored: true,
});

module.exports = DeviceTypeSignal; 