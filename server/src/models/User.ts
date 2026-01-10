import { Model, DataTypes, Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';

interface UserAttributes {
  id?: number;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  isActive: boolean;
}

export class User extends Model<UserAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public role!: 'admin' | 'user';
  public isActive!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Метод для проверки пароля
  public async checkPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // Хэширование пароля перед сохранением
  public async hashPassword(): Promise<void> {
    if (this.password) {
      const saltRounds = 12;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
  }

  public static initialize(sequelize: Sequelize): void {
    User.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        username: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
          validate: {
            len: [3, 50],
          },
        },
        email: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
          validate: {
            isEmail: true,
          },
        },
        password: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            len: [6, 255],
          },
        },
        role: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'user',
          validate: {
            isIn: [['admin', 'user']],
          },
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        tableName: 'users',
        timestamps: true,
        underscored: true,
        hooks: {
          beforeCreate: async (user: User) => {
            await user.hashPassword();
          },
          beforeUpdate: async (user: User) => {
            if (user.changed('password')) {
              await user.hashPassword();
            }
          },
        },
      }
    );
  }

  public static associate() {
    // Связи с другими моделями
    const { Project } = require('./Project');
    User.hasMany(Project, {
      foreignKey: 'createdBy',
      as: 'createdProjects',
    });
  }
}

export default User;