import { Model, DataTypes, Sequelize } from 'sequelize';

interface DeviceAttributes {
  id?: number;
  systemCode: string;
  equipmentCode: string;
  lineNumber: string;
  cabinetName: string;
  deviceDesignation: string;
  deviceType: string;
  description: string;
  parentId?: number | null;
}

export class Device extends Model<DeviceAttributes> implements DeviceAttributes {
  public id!: number;
  public systemCode!: string;
  public equipmentCode!: string;
  public lineNumber!: string;
  public cabinetName!: string;
  public deviceDesignation!: string;
  public deviceType!: string;
  public description!: string;
  public parentId!: number | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    Device.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        systemCode: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        equipmentCode: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        lineNumber: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        cabinetName: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        deviceDesignation: {
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
        parentId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'devices',
            key: 'id',
          },
        },
      },
      {
        sequelize,
        tableName: 'devices',
        timestamps: true,
      }
    );
  }

  public static associate() {
    Device.hasMany(Device, {
      foreignKey: 'parentId',
      as: 'children',
    });
    Device.belongsTo(Device, {
      foreignKey: 'parentId',
      as: 'parent',
    });
    
    // Связь с DeviceSignal будет добавлена после инициализации DeviceSignal
  }
} 