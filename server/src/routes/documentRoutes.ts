import express, { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as documentController from '../controllers/documentController';

const router = express.Router();

router.use(authenticateToken);

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  documentController.listDocuments(req, res, next).catch(next);
});

router.post(
  '/',
  documentController.upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    documentController.createDocument(req, res, next).catch(next);
  }
);

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  documentController.getDocument(req, res, next).catch(next);
});

router.get('/:id/versions', (req: Request, res: Response, next: NextFunction) => {
  documentController.listVersions(req, res, next).catch(next);
});

router.post(
  '/:id/versions',
  documentController.upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    documentController.uploadVersion(req, res, next).catch(next);
  }
);

router.get('/:id/versions/:versionId/download', (req: Request, res: Response, next: NextFunction) => {
  documentController.downloadVersion(req, res, next).catch(next);
});

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  documentController.deleteDocument(req, res, next).catch(next);
});

export default router;
