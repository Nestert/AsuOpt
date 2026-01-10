import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

// JWT секретный ключ (в продакшене должен быть в переменных окружения)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Аутентификация пользователей
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: Имя пользователя
 *         password:
 *           type: string
 *           description: Пароль
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: Имя пользователя
 *         email:
 *           type: string
 *           description: Email адрес
 *         password:
 *           type: string
 *           description: Пароль
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT токен
 *         user:
 *           $ref: '#/components/schemas/User'
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, user]
 *         isActive:
 *           type: boolean
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Пользователь зарегистрирован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Ошибка валидации
 *       409:
 *         description: Пользователь уже существует
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Проверка обязательных полей
    if (!username || !email || !password) {
      res.status(400).json({
        message: 'Необходимо указать username, email и password'
      });
      return;
    }

    // Проверка существующего пользователя
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      res.status(409).json({
        message: 'Пользователь с таким именем или email уже существует'
      });
      return;
    }

    // Создание нового пользователя
    const user = await User.create({
      username,
      email,
      password, // пароль будет хэширован в модели
      role: 'user',
      isActive: true
    });

    // Генерация JWT токена
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Возвращаем пользователя без пароля
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(201).json({
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(500).json({
      message: 'Внутренняя ошибка сервера'
    });
  }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Неверные учетные данные
 *       401:
 *         description: Пользователь не активен
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Проверка обязательных полей
    if (!username || !password) {
      res.status(400).json({
        message: 'Необходимо указать username и password'
      });
      return;
    }

    // Поиск пользователя
    const user = await User.findOne({
      where: { username }
    });

    console.log('Login attempt for user:', username);
    console.log('User found:', !!user);

    if (!user) {
      res.status(400).json({
        message: 'Неверное имя пользователя или пароль'
      });
      return;
    }

    // Проверка активности пользователя
    if (!user.isActive) {
      res.status(401).json({
        message: 'Аккаунт пользователя не активен'
      });
      return;
    }

    // Проверка пароля
    console.log('Checking password for user:', user.username);
    const isPasswordValid = await user.checkPassword(password);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      res.status(400).json({
        message: 'Неверное имя пользователя или пароль'
      });
      return;
    }

    // Генерация JWT токена
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Возвращаем пользователя без пароля
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      token,
      user: userResponse
    });
    return;

  } catch (error) {
    console.error('Ошибка при входе:', error);
    res.status(500).json({
      message: 'Внутренняя ошибка сервера'
    });
  }
};

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получить информацию о текущем пользователе
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Информация о пользователе
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Не авторизован
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // Пользователь уже проверен в middleware
    const user = (req as any).user;

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
    res.status(500).json({
      message: 'Внутренняя ошибка сервера'
    });
  }
};

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Выход из системы
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Успешный выход
 */
export const logout = async (req: Request, res: Response) => {
  // В случае JWT токенов, выход обрабатывается на клиенте
  // путем удаления токена из localStorage/sessionStorage
  res.json({
    message: 'Выход выполнен успешно'
  });
};