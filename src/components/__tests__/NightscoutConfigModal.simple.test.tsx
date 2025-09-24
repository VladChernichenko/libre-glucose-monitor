import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple test component to verify testing setup
const TestComponent = () => {
  return <div data-testid="test-component">Test Component</div>;
};

describe('Testing Setup Verification', () => {
  it('should render a simple component', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('should have access to jest-dom matchers', () => {
    const element = document.createElement('div');
    element.textContent = 'Hello World';
    
    // Append to document to make it "in the document"
    document.body.appendChild(element);
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Hello World');
    
    // Clean up
    document.body.removeChild(element);
  });
});
