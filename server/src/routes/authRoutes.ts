import { Router } from 'express';
import { register, login, getCurrentUser, logout } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { authLoginBodySchema, authRegisterBodySchema } from '../validation/schemas';

const router = Router();

// Регистрация нового пользователя
router.post('/register', validateBody(authRegisterBodySchema), register);

// Вход в систему
router.post('/login', validateBody(authLoginBodySchema), login);

// Получить информацию о текущем пользователе
router.get('/me', authenticateToken, getCurrentUser);

// Выход из системы
router.post('/logout', authenticateToken, logout);

export default router;
