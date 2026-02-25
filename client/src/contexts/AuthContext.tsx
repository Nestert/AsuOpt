import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginRequest, RegisterRequest, AuthContextType } from '../interfaces/User';
import { authService, AUTH_UNAUTHORIZED_EVENT } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Вход в систему
  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      const response = await authService.login(credentials);
      const { token, user: userData } = response;

      // Сохраняем токен и данные пользователя в localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      // Устанавливаем пользователя в состоянии
      setUser(userData);
    } catch (error) {
      console.error('Ошибка входа:', error);
      throw error;
    }
  };

  // Регистрация
  const register = async (userData: RegisterRequest): Promise<void> => {
    try {
      const response = await authService.register(userData);
      const { token, user: newUser } = response;

      // Сохраняем токен и данные пользователя в localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(newUser));

      // Устанавливаем пользователя в состоянии
      setUser(newUser);
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      throw error;
    }
  };

  // Выход из системы
  const logout = (): void => {
    // Очищаем localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Сбрасываем состояние
    setUser(null);
  };

  // Проверка аутентификации при загрузке приложения
  const checkAuth = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        // Проверяем токен на сервере
        const user = await authService.getCurrentUser();
        setUser(user);
      }
    } catch (error) {
      console.error('Ошибка проверки аутентификации:', error);
      // Если токен недействителен, очищаем данные
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Проверяем аутентификацию при монтировании
  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setIsLoading(false);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Хук для использования контекста
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};
