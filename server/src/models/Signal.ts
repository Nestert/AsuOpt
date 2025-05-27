import { Model, DataTypes, Sequelize } from 'sequelize';

interface SignalAttributes {
  id?: number;
  name: string;
  type: string; // AI, AO, DI, DO
  description: string;
  totalCount: number;
  category?: string; // Категория устройства
  connectionType?: string; // Тип подключения (2-провод, 4-провод и т.д.)
  voltage?: string; // Напряжение (4-20mA, 24V)
}

export class Signal extends Model<SignalAttributes> implements SignalAttributes {
  public id!: number;
  public name!: string;
  public type!: string;
  public description!: string;
  public totalCount!: number;
  public category!: string;
  public connectionType!: string;
  public voltage!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    Signal.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            isIn: [['AI', 'AO', 'DI', 'DO']]
          }
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        totalCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        category: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        connectionType: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        voltage: {
          type: DataTypes.STRING,
          allowNull: true,
        }
      },
      {
        sequelize,
        tableName: 'signals',
        timestamps: true,
      }
    );
  }
  
  public static associate(): void {
    // Связь с DeviceSignal
    const { DeviceSignal } = require('./DeviceSignal');
    Signal.hasMany(DeviceSignal, {
      foreignKey: 'signalId',
      as: 'deviceSignals',
    });
  }
} 