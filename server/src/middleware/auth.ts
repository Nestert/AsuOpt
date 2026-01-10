import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Расширяем интерфейс Request для добавления пользователя
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware для аутентификации JWT токена
 */
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        message: 'Требуется авторизация'
      });
      return;
    }

    // Верификация токена
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Проверка существования пользователя в базе данных
    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json({
        message: 'Пользователь не найден или не активен'
      });
      return;
    }

    // Добавляем пользователя в request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          message: 'Неверный токен авторизации'
        });
        return;
      }

      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          message: 'Токен авторизации истек'
        });
        return;
      }

      console.error('Ошибка аутентификации:', error);
      res.status(500).json({
        message: 'Внутренняя ошибка сервера'
      });
      return;
    }
};

/**
 * Middleware для проверки роли администратора
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Требуется авторизация'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Требуются права администратора'
    });
  }

  next();
};

/**
 * Middleware для проверки роли пользователя (admin или user)
 */
export const requireUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Требуется авторизация'
    });
  }

  next();
};