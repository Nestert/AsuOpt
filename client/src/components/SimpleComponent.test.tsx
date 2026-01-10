import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Простой тестовый компонент без antd
const SimpleComponent = () => {
  return (
    <div>
      <h1>Test Component</h1>
      <p>This is a simple test component</p>
    </div>
  );
};

describe('Simple Component', () => {
  it('renders correctly', () => {
    render(<SimpleComponent />);

    expect(screen.getByText('Test Component')).toBeInTheDocument();
    expect(screen.getByText('This is a simple test component')).toBeInTheDocument();
  });
});