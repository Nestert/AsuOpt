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

// Мокаем тяжелые дочерние компоненты, чтобы App-тест проверял только компоновку
jest.mock('./components/ProjectSelector', () => () => <div>ProjectSelector</div>);
jest.mock('./components/DeviceTree', () => () => <div>DeviceTree</div>);
jest.mock('./components/DeviceDetails', () => () => <div>DeviceDetails</div>);
jest.mock('./components/BatchEditModal', () => () => null);
jest.mock('./components/QuestionnaireModal', () => () => null);
jest.mock('./components/ImportData', () => () => <div>ImportData</div>);
jest.mock('./components/DatabaseActions', () => () => <div>DatabaseActions</div>);
jest.mock('./components/SignalManagement', () => () => <div>SignalManagement</div>);
jest.mock('./components/DataExport', () => () => <div>DataExport</div>);
jest.mock('./components/ProjectManagement', () => () => null);
jest.mock('./components/Login', () => () => <div>Login</div>);
jest.mock('./components/Register', () => () => <div>Register</div>);

test('renders app title', () => {
  render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  const titleElement = screen.getByText(/АСУ-Оптимизация/i);
  expect(titleElement).toBeInTheDocument();
});
