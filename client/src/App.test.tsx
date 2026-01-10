import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock контекстов
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { username: 'testuser', email: 'test@example.com', role: 'user' },
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock('./contexts/ProjectContext', () => ({
  ProjectProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useProject: () => ({
    currentProjectId: 1,
    setCurrentProjectId: jest.fn(),
    refreshProjects: jest.fn(),
  }),
}));

test('renders app title', () => {
  render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  const titleElement = screen.getByText(/АСУ-Оптимизация/i);
  expect(titleElement).toBeInTheDocument();
});
