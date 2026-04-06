import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Document, DocumentVersion } from '../models/Document';
import { User } from '../models/User';
import { ApiError } from '../errors/ApiError';
import { AuthRequest } from '../middleware/auth';

const DOCUMENTS_DIR = path.join(__dirname, '../../uploads/documents');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Временная папка — переместим после получения document id
    const tmpDir = path.join(DOCUMENTS_DIR, 'tmp');
    fs.mkdirSync(tmpDir, { recursive: true });
    cb(null, tmpDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// GET /api/documents?projectId=...
export const listDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const projectId = Number(req.query.projectId);
    if (!Number.isFinite(projectId)) {
      return next(new ApiError(400, 'INVALID_PROJECT_ID', 'Укажите projectId'));
    }

    const documents = await Document.findAll({
      where: { projectId },
      include: [
        {
          model: DocumentVersion,
          as: 'versions',
          include: [{ model: User, as: 'uploader', attributes: ['id', 'username'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Добавляем latestVersion для удобства клиента
    const result = documents.map((doc) => {
      const plain = doc.toJSON() as any;
      const versions: any[] = plain.versions || [];
      plain.latestVersion = versions.length > 0
        ? versions.reduce((a: any, b: any) => (a.versionNumber > b.versionNumber ? a : b))
        : null;
      return plain;
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/documents  (multipart: name, description?, changeComment?, file)
export const createDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const file = req.file;
  try {
    const { name, description, changeComment } = req.body;
    if (!name) {
      if (file) fs.unlinkSync(file.path);
      return next(new ApiError(400, 'MISSING_NAME', 'Поле name обязательно'));
    }
    if (!file) {
      return next(new ApiError(400, 'MISSING_FILE', 'Файл обязателен'));
    }

    const projectId = Number(req.body.projectId);
    if (!Number.isFinite(projectId)) {
      fs.unlinkSync(file.path);
      return next(new ApiError(400, 'INVALID_PROJECT_ID', 'Укажите projectId'));
    }

    const doc = await Document.create({
      projectId,
      name,
      description: description || null,
      createdBy: req.user?.id,
    });

    // Перемещаем файл из tmp в uploads/documents/{docId}/
    const docDir = path.join(DOCUMENTS_DIR, String(doc.id));
    fs.mkdirSync(docDir, { recursive: true });
    const destFilename = `v1_${file.originalname}`;
    const destPath = path.join(docDir, destFilename);
    fs.renameSync(file.path, destPath);

    const version = await DocumentVersion.create({
      documentId: doc.id,
      versionNumber: 1,
      filename: file.originalname,
      storagePath: path.relative(path.join(__dirname, '../..'), destPath),
      mimeType: file.mimetype || null,
      fileSize: file.size,
      changeComment: changeComment || null,
      uploadedBy: req.user?.id,
    });

    res.status(201).json({ ...doc.toJSON(), latestVersion: version.toJSON() });
  } catch (err) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    next(err);
  }
};

// GET /api/documents/:id
export const getDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doc = await Document.findByPk(req.params.id, {
      include: [{ model: DocumentVersion, as: 'versions' }],
    });
    if (!doc) return next(new ApiError(404, 'NOT_FOUND', 'Документ не найден'));
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/:id/versions
export const listVersions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return next(new ApiError(404, 'NOT_FOUND', 'Документ не найден'));

    const versions = await DocumentVersion.findAll({
      where: { documentId: doc.id },
      include: [{ model: User, as: 'uploader', attributes: ['id', 'username'] }],
      order: [['versionNumber', 'DESC']],
    });
    res.json(versions);
  } catch (err) {
    next(err);
  }
};

// POST /api/documents/:id/versions  (multipart: changeComment?, file)
export const uploadVersion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const file = req.file;
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) {
      if (file) fs.unlinkSync(file.path);
      return next(new ApiError(404, 'NOT_FOUND', 'Документ не найден'));
    }
    if (!file) return next(new ApiError(400, 'MISSING_FILE', 'Файл обязателен'));

    const { changeComment } = req.body;

    // Определяем следующий номер версии
    const lastVersion = await DocumentVersion.findOne({
      where: { documentId: doc.id },
      order: [['versionNumber', 'DESC']],
    });
    const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

    const docDir = path.join(DOCUMENTS_DIR, String(doc.id));
    fs.mkdirSync(docDir, { recursive: true });
    const destFilename = `v${nextVersionNumber}_${file.originalname}`;
    const destPath = path.join(docDir, destFilename);
    fs.renameSync(file.path, destPath);

    const version = await DocumentVersion.create({
      documentId: doc.id,
      versionNumber: nextVersionNumber,
      filename: file.originalname,
      storagePath: path.relative(path.join(__dirname, '../..'), destPath),
      mimeType: file.mimetype || null,
      fileSize: file.size,
      changeComment: changeComment || null,
      uploadedBy: req.user?.id,
    });

    // Обновляем updated_at документа
    await doc.update({ updatedAt: new Date() } as any);

    res.status(201).json(version);
  } catch (err) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    next(err);
  }
};

// GET /api/documents/:id/versions/:versionId/download
export const downloadVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const version = await DocumentVersion.findOne({
      where: { id: req.params.versionId, documentId: req.params.id },
    });
    if (!version) return next(new ApiError(404, 'NOT_FOUND', 'Версия не найдена'));

    const absPath = path.join(__dirname, '../..', version.storagePath);
    if (!fs.existsSync(absPath)) return next(new ApiError(404, 'FILE_NOT_FOUND', 'Файл не найден на диске'));

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(version.filename)}"`);
    if (version.mimeType) res.setHeader('Content-Type', version.mimeType);
    res.sendFile(absPath);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/documents/:id
export const deleteDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doc = await Document.findByPk(req.params.id, {
      include: [{ model: DocumentVersion, as: 'versions' }],
    });
    if (!doc) return next(new ApiError(404, 'NOT_FOUND', 'Документ не найден'));

    // Удаляем физические файлы
    const docDir = path.join(DOCUMENTS_DIR, String(doc.id));
    if (fs.existsSync(docDir)) {
      fs.rmSync(docDir, { recursive: true, force: true });
    }

    await doc.destroy();
    res.json({ message: 'Документ удалён' });
  } catch (err) {
    next(err);
  }
};
