import { Model, DataTypes, Sequelize } from 'sequelize';

interface DeviceReferenceAttributes {
  id?: number;
  posDesignation: string; // Позиционное обозначение
  deviceType: string;     // Тип устройства
  description?: string;   // Описание (опционально)
  parentSystem?: string;  // Родительская система (опционально)
}

export class DeviceReference extends Model<DeviceReferenceAttributes> implements DeviceReferenceAttributes {
  public id!: number;
  public posDesignation!: string;
  public deviceType!: string;
  public description!: string;
  public parentSystem!: string;

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
          unique: true, // Уникальное позиционное обозначение
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
      },
      {
        sequelize,
        tableName: 'device_references',
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ['posDesignation'],
          },
        ],
      }
    );
  }
} 