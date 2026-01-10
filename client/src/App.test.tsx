import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/АСУ-Оптимизация/i);
  expect(titleElement).toBeInTheDocument();
});
