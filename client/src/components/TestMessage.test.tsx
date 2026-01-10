import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Простой компонент без внешних зависимостей
const TestMessage = ({ message }: { message: string }) => (
  <div data-testid="test-message">
    <h2>{message}</h2>
  </div>
);

describe('TestMessage Component', () => {
  it('renders message correctly', () => {
    render(<TestMessage message="Hello World" />);

    expect(screen.getByTestId('test-message')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders different messages', () => {
    const { rerender } = render(<TestMessage message="First Message" />);

    expect(screen.getByText('First Message')).toBeInTheDocument();

    rerender(<TestMessage message="Second Message" />);
    expect(screen.getByText('Second Message')).toBeInTheDocument();
  });
});