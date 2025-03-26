import { Model, DataTypes, Sequelize } from 'sequelize';
import { DeviceReference } from './DeviceReference';

interface ZraAttributes {
  id?: number;
  deviceReferenceId: number; // Ссылка на справочник устройств
  unitArea?: string;         // Участок
  designType?: string;       // Конструктивное исполнение
  valveType?: string;        // Тип арматуры (запорная/регулирующая)
  actuatorType?: string;     // Тип привода
  pipePosition?: string;     // Позиция трубы
  nominalDiameter?: string;  // Условный диаметр трубы DN
  pressureRating?: string;   // Условное давление рабочей среды PN
  pipeMaterial?: string;     // Материал трубы
  medium?: string;           // Среда
  positionSensor?: string;   // Датчик положения
  solenoidType?: string;     // Тип пневмораспределителя
  emergencyPosition?: string; // Положение при аварийном отключении
  controlPanel?: string;     // ШПУ
  airConsumption?: string;   // Расход воздуха на 1 операцию
  connectionSize?: string;   // Ø и резьба пневмоприсоединения
  fittingsCount?: number;    // Кол-во ответных фитингов
  tubeDiameter?: string;     // Ø пневмотрубки
  limitSwitchType?: string;  // Тип концевого выключателя
  positionerType?: string;   // Тип позиционера
  deviceDescription?: string; // Описание устройства
  category?: string;         // Категория
  plc?: string;              // PLC
  exVersion?: string;        // Ex-исполнение
  operation?: string;        // Операция
  note?: string;             // Примечание
}

export class Zra extends Model<ZraAttributes> implements ZraAttributes {
  public id!: number;
  public deviceReferenceId!: number;
  public unitArea!: string;
  public designType!: string;
  public valveType!: string;
  public actuatorType!: string;
  public pipePosition!: string;
  public nominalDiameter!: string;
  public pressureRating!: string;
  public pipeMaterial!: string;
  public medium!: string;
  public positionSensor!: string;
  public solenoidType!: string;
  public emergencyPosition!: string;
  public controlPanel!: string;
  public airConsumption!: string;
  public connectionSize!: string;
  public fittingsCount!: number;
  public tubeDiameter!: string;
  public limitSwitchType!: string;
  public positionerType!: string;
  public deviceDescription!: string;
  public category!: string;
  public plc!: string;
  public exVersion!: string;
  public operation!: string;
  public note!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Связь с DeviceReference
  public deviceReference?: DeviceReference;

  public static initialize(sequelize: Sequelize): void {
    Zra.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        deviceReferenceId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'device_references',
            key: 'id',
          },
        },
        unitArea: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        designType: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        valveType: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        actuatorType: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        pipePosition: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        nominalDiameter: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        pressureRating: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        pipeMaterial: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        medium: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        positionSensor: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        solenoidType: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        emergencyPosition: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        controlPanel: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        airConsumption: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        connectionSize: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        fittingsCount: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        tubeDiameter: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        limitSwitchType: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        positionerType: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        deviceDescription: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        category: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        plc: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        exVersion: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        operation: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        note: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'zras',
        timestamps: true,
      }
    );
  }

  public static associate(): void {
    // Импортируем модель здесь, чтобы избежать циклических зависимостей
    const { DeviceReference } = require('./DeviceReference');
    
    // Каждая запись ZRA принадлежит одному устройству из справочника
    Zra.belongsTo(DeviceReference, {
      foreignKey: 'deviceReferenceId',
      as: 'deviceReference',
    });
  }
} 