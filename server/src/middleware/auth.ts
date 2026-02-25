import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { getJwtSecret } from '../config/env';
import { ApiError } from '../errors/ApiError';

const JWT_SECRET = getJwtSecret();

// Расширяем интерфейс Request для добавления пользователя
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        role: string;
      };
      requestId?: string;
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
      next(new ApiError(401, 'UNAUTHORIZED', 'Требуется авторизация'));
      return;
    }

    // Верификация токена
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    const userId = typeof decoded?.id === 'number' ? decoded.id : Number(decoded?.id);
    if (!Number.isFinite(userId)) {
      next(new ApiError(401, 'INVALID_TOKEN', 'Неверный токен авторизации'));
      return;
    }

    // Проверка существования пользователя в базе данных
    const user = await User.findByPk(userId);
    if (!user || !user.isActive) {
      next(new ApiError(401, 'UNAUTHORIZED', 'Пользователь не найден или не активен'));
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
        next(new ApiError(401, 'INVALID_TOKEN', 'Неверный токен авторизации'));
        return;
      }

      if (error instanceof jwt.TokenExpiredError) {
        next(new ApiError(401, 'TOKEN_EXPIRED', 'Токен авторизации истек'));
        return;
      }

      console.error('Ошибка аутентификации:', error);
      next(new ApiError(500, 'AUTH_ERROR', 'Внутренняя ошибка сервера'));
      return;
    }
};

/**
 * Middleware для проверки роли администратора
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Требуется авторизация'));
    return;
  }

  if (req.user.role !== 'admin') {
    next(new ApiError(403, 'FORBIDDEN', 'Требуются права администратора'));
    return;
  }

  next();
};

/**
 * Middleware для проверки роли пользователя (admin или user)
 */
export const requireUser = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Требуется авторизация'));
    return;
  }

  next();
};
