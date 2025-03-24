import { Model, DataTypes, Sequelize } from 'sequelize';
import { Device } from './Device';
import { Signal } from './Signal';

interface DeviceSignalAttributes {
  id?: number;
  deviceId: number;
  signalId: number;
  count: number;
}

export class DeviceSignal extends Model<DeviceSignalAttributes> implements DeviceSignalAttributes {
  public id!: number;
  public deviceId!: number;
  public signalId!: number;
  public count!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    DeviceSignal.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        deviceId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'devices',
            key: 'id',
          },
        },
        signalId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'signals',
            key: 'id',
          },
        },
        count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        }
      },
      {
        sequelize,
        tableName: 'device_signals',
        timestamps: true,
      }
    );
  }

  public static associate(): void {
    DeviceSignal.belongsTo(Device, {
      foreignKey: 'deviceId',
      as: 'device',
    });
    
    DeviceSignal.belongsTo(Signal, {
      foreignKey: 'signalId',
      as: 'signal',
    });
  }
} 