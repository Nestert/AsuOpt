import { Model, DataTypes, Sequelize } from 'sequelize';
import { Project } from './Project';
import { User } from './User';

export type ComparisonStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';

interface DocumentComparisonAttributes {
  id?: number;
  documentId: number;
  baseVersionId: number;
  targetVersionId: number;
  status: ComparisonStatus;
  reportText?: string | null;
  reportJson?: string | null;
  warnings?: string | null;
  artifactsPath?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
}

export class DocumentComparison
  extends Model<DocumentComparisonAttributes>
  implements DocumentComparisonAttributes {
  public id!: number;
  public documentId!: number;
  public baseVersionId!: number;
  public targetVersionId!: number;
  public status!: ComparisonStatus;
  public reportText!: string | null;
  public reportJson!: string | null;
  public warnings!: string | null;
  public artifactsPath!: string | null;
  public startedAt!: Date | null;
  public finishedAt!: Date | null;

  public readonly createdAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    DocumentComparison.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        documentId: { type: DataTypes.INTEGER, allowNull: false, field: 'document_id' },
        baseVersionId: { type: DataTypes.INTEGER, allowNull: false, field: 'base_version_id' },
        targetVersionId: { type: DataTypes.INTEGER, allowNull: false, field: 'target_version_id' },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'PENDING',
        },
        reportText: { type: DataTypes.TEXT, allowNull: true, field: 'report_text' },
        reportJson: { type: DataTypes.TEXT, allowNull: true, field: 'report_json' },
        warnings: { type: DataTypes.TEXT, allowNull: true },
        artifactsPath: { type: DataTypes.STRING(500), allowNull: true, field: 'artifacts_path' },
        startedAt: { type: DataTypes.DATE, allowNull: true, field: 'started_at' },
        finishedAt: { type: DataTypes.DATE, allowNull: true, field: 'finished_at' },
      },
      {
        sequelize,
        tableName: 'document_comparisons',
        timestamps: true,
        updatedAt: false,
        underscored: true,
      }
    );
  }

  public static associate(): void {
    DocumentComparison.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });
    DocumentComparison.belongsTo(DocumentVersion, { foreignKey: 'baseVersionId', as: 'baseVersion' });
    DocumentComparison.belongsTo(DocumentVersion, { foreignKey: 'targetVersionId', as: 'targetVersion' });
  }
}

interface DocumentAttributes {
  id?: number;
  projectId: number;
  name: string;
  description?: string;
  createdBy?: number;
}

export class Document extends Model<DocumentAttributes> implements DocumentAttributes {
  public id!: number;
  public projectId!: number;
  public name!: string;
  public description!: string;
  public createdBy!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    Document.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        projectId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'project_id',
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'created_by',
        },
      },
      {
        sequelize,
        tableName: 'documents',
        timestamps: true,
        underscored: true,
      }
    );
  }

  public static associate(): void {
    Document.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
    Document.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
    Document.hasMany(DocumentVersion, { foreignKey: 'documentId', as: 'versions' });
    Document.hasMany(DocumentComparison, { foreignKey: 'documentId', as: 'comparisons' });
  }
}

interface DocumentVersionAttributes {
  id?: number;
  documentId: number;
  versionNumber: number;
  filename: string;
  storagePath: string;
  mimeType?: string;
  fileSize?: number;
  changeComment?: string;
  uploadedBy?: number;
}

export class DocumentVersion extends Model<DocumentVersionAttributes> implements DocumentVersionAttributes {
  public id!: number;
  public documentId!: number;
  public versionNumber!: number;
  public filename!: string;
  public storagePath!: string;
  public mimeType!: string;
  public fileSize!: number;
  public changeComment!: string;
  public uploadedBy!: number;

  public readonly createdAt!: Date;

  public static initialize(sequelize: Sequelize): void {
    DocumentVersion.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        documentId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'document_id',
        },
        versionNumber: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'version_number',
        },
        filename: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        storagePath: {
          type: DataTypes.STRING(500),
          allowNull: false,
          field: 'storage_path',
        },
        mimeType: {
          type: DataTypes.STRING(100),
          allowNull: true,
          field: 'mime_type',
        },
        fileSize: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'file_size',
        },
        changeComment: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'change_comment',
        },
        uploadedBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'uploaded_by',
        },
      },
      {
        sequelize,
        tableName: 'document_versions',
        timestamps: true,
        updatedAt: false,
        underscored: true,
      }
    );
  }

  public static associate(): void {
    DocumentVersion.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });
    DocumentVersion.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });
    DocumentVersion.hasMany(DocumentComparison, { foreignKey: 'baseVersionId', as: 'comparisonsAsBase' });
    DocumentVersion.hasMany(DocumentComparison, { foreignKey: 'targetVersionId', as: 'comparisonsAsTarget' });
  }
}
