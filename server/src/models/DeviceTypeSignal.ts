import { Model, DataTypes, Sequelize } from 'sequelize';

// Интерфейс атрибутов модели DeviceTypeSignal
interface DeviceTypeSignalAttributes {
  id?: number;
  deviceType: string;
  aiCount: number;
  aoCount: number;
  diCount: number;
  doCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class DeviceTypeSignal extends Model<DeviceTypeSignalAttributes> implements DeviceTypeSignalAttributes {
  public id!: number;
  public deviceType!: string;
  public aiCount!: number;
  public aoCount!: number;
  public diCount!: number;
  public doCount!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    DeviceTypeSignal.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        deviceType: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          field: 'device_type'
        },
        aiCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'ai_count'
        },
        aoCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'ao_count'
        },
        diCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'di_count'
        },
        doCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'do_count'
        }
      },
      {
        sequelize,
        tableName: 'device_type_signals',
        timestamps: true,
        underscored: true
      }
    );
  }
} 