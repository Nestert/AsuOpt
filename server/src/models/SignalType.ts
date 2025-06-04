import { Model, DataTypes, Sequelize } from 'sequelize';

export interface SignalTypeAttributes {
  id?: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
}

export class SignalType extends Model<SignalTypeAttributes> implements SignalTypeAttributes {
  public id!: number;
  public code!: string;
  public name!: string;
  public description?: string;
  public category?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    SignalType.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        code: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        category: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'signal_types',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    );
  }
}
