import { Router } from 'express';
import { register, login, getCurrentUser, logout } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Регистрация нового пользователя
router.post('/register', register);

// Вход в систему
router.post('/login', login);

// Получить информацию о текущем пользователе
router.get('/me', authenticateToken, getCurrentUser);

// Выход из системы
router.post('/logout', authenticateToken, logout);

export default router;