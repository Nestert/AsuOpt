import { Model, DataTypes, Sequelize } from 'sequelize';

interface DeviceReferenceAttributes {
  id?: number;
  posDesignation: string; // Позиционное обозначение
  deviceType: string;     // Тип устройства
  description?: string;   // Описание (опционально)
  parentSystem?: string;  // Родительская система (опционально)
  systemCode?: string;    // Код системы (опционально)
  plcType?: string;       // Тип ПЛК (опционально)
  exVersion?: string;     // Ex-версия (опционально)
  projectId?: number;     // ID проекта
}

export class DeviceReference extends Model<DeviceReferenceAttributes> implements DeviceReferenceAttributes {
  public id!: number;
  public posDesignation!: string;
  public deviceType!: string;
  public description!: string;
  public parentSystem!: string;
  public systemCode!: string;
  public plcType!: string;
  public exVersion!: string;
  public projectId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    DeviceReference.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        posDesignation: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        deviceType: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        parentSystem: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        systemCode: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        plcType: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        exVersion: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        projectId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
          field: 'project_id',
        },
      },
      {
        sequelize,
        tableName: 'device_references',
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ['project_id', 'posDesignation'],
          },
        ],
      }
    );
  }
  
  // Определение ассоциаций с другими моделями
  public static associate(): void {
    // Импортируем модели здесь, чтобы избежать циклических зависимостей
    const { Kip } = require('./Kip');
    const { Zra } = require('./Zra');
    
    // Один девайс в справочнике имеет одну запись КИП
    DeviceReference.hasOne(Kip, {
      foreignKey: 'deviceReferenceId',
      as: 'kip',
      onDelete: 'CASCADE'
    });
    
    // Один девайс в справочнике имеет одну запись ЗРА
    DeviceReference.hasOne(Zra, {
      foreignKey: 'deviceReferenceId',
      as: 'zra',
      onDelete: 'CASCADE'
    });
  }
} 