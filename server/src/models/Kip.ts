import { Model, DataTypes, Sequelize } from 'sequelize';
import { DeviceReference } from './DeviceReference';

interface KipAttributes {
  id?: number;
  deviceReferenceId: number; // Ссылка на справочник устройств
  section?: string;          // Секция
  unitArea?: string;         // Участок
  manufacturer?: string;     // Производитель
  article?: string;          // Артикул
  measureUnit?: string;      // Единица измерения
  scale?: string;            // Шкала
  note?: string;             // Примечание
  docLink?: string;          // Ссылка на документацию
  responsibilityZone?: string; // Зона ответственности
  connectionScheme?: string; // Схема подключения
  power?: string;            // Питание
  plc?: string;              // ПЛК
  exVersion?: string;        // Ex-исполнение
  environmentCharacteristics?: string; // Характеристики среды
  signalPurpose?: string;    // Назначение сигнала
  controlPoints?: number;    // Количество точек контроля
  completeness?: string;     // Комплектность
  measuringLimits?: string;  // Пределы измерений
  // Дополнительные поля можно добавить при необходимости
}

export class Kip extends Model<KipAttributes> implements KipAttributes {
  public id!: number;
  public deviceReferenceId!: number;
  public section!: string;
  public unitArea!: string;
  public manufacturer!: string;
  public article!: string;
  public measureUnit!: string;
  public scale!: string;
  public note!: string;
  public docLink!: string;
  public responsibilityZone!: string;
  public connectionScheme!: string;
  public power!: string;
  public plc!: string;
  public exVersion!: string;
  public environmentCharacteristics!: string;
  public signalPurpose!: string;
  public controlPoints!: number;
  public completeness!: string;
  public measuringLimits!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Связь с DeviceReference
  public deviceReference?: DeviceReference;

  public static initialize(sequelize: Sequelize): void {
    Kip.init(
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
        section: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        unitArea: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        manufacturer: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        article: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        measureUnit: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        scale: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        note: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        docLink: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        responsibilityZone: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        connectionScheme: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        power: {
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
        environmentCharacteristics: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        signalPurpose: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        controlPoints: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        completeness: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        measuringLimits: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'kips',
        timestamps: true,
      }
    );
  }

  public static associate(): void {
    // Импортируем модель здесь, чтобы избежать циклических зависимостей
    const { DeviceReference } = require('./DeviceReference');
    
    // Каждая запись KIP принадлежит одному устройству из справочника
    Kip.belongsTo(DeviceReference, {
      foreignKey: 'deviceReferenceId',
      as: 'deviceReference',
    });
  }
} 