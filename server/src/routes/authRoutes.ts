import { Router, Request, Response, NextFunction } from 'express';
import { register, login, getCurrentUser, logout } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { authLoginBodySchema, authRegisterBodySchema } from '../validation/schemas';

const router = Router();

// Регистрация нового пользователя
router.post('/register', validateBody(authRegisterBodySchema), (req: Request, res: Response, next: NextFunction) => {
  register(req, res).catch(next);
});

// Вход в систему
router.post('/login', validateBody(authLoginBodySchema), (req: Request, res: Response, next: NextFunction) => {
  login(req, res).catch(next);
});

// Получить информацию о текущем пользователе
router.get('/me', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
  getCurrentUser(req, res).catch(next);
});

// Выход из системы
router.post('/logout', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
  logout(req, res).catch(next);
});

export default router;
