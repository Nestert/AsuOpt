import { Model, DataTypes, Sequelize } from 'sequelize';

interface ProjectAttributes {
  id?: number;
  name: string;
  description?: string;
  code: string;
  status: 'active' | 'archived' | 'template';
  createdBy?: number;
  settings?: string; // JSON в виде строки для SQLite
}

export class Project extends Model<ProjectAttributes> implements ProjectAttributes {
  public id!: number;
  public name!: string;
  public description!: string;
  public code!: string;
  public status!: 'active' | 'archived' | 'template';
  public createdBy!: number;
  public settings!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Виртуальное поле для работы с settings как объектом
  public get settingsObject(): object | null {
    if (!this.settings) return null;
    try {
      return JSON.parse(this.settings);
    } catch {
      return null;
    }
  }

  public set settingsObject(value: object | null) {
    this.settings = value ? JSON.stringify(value) : null;
  }

  public static initialize(sequelize: Sequelize): void {
    Project.init(
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
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        code: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'active',
          validate: {
            isIn: [['active', 'archived', 'template']],
          },
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'created_by',
        },
        settings: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'projects',
        timestamps: true,
        underscored: true, // Использует snake_case для полей
      }
    );
  }

  public static associate(models: any) {
    // Связи с другими моделями будут добавлены после создания всех моделей
    // Project.hasMany(models.DeviceReference, {
    //   foreignKey: 'projectId',
    //   as: 'devices',
    // });
    
    // Project.hasMany(models.Signal, {
    //   foreignKey: 'projectId',
    //   as: 'signals',
    // });
  }
}

export default Project; 