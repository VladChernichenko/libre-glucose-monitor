import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import NightscoutConfigModal from '../NightscoutConfigModal';

// Mock the environment config
jest.mock('../../config/environments', () => ({
  getEnvironmentConfig: () => ({
    backendUrl: 'http://localhost:8080',
  }),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('NightscoutConfigModal Save Button', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    existingConfig: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Save Button Functionality', () => {
    it('should render the save button', () => {
      render(<NightscoutConfigModal {...defaultProps} />);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeInTheDocument();
    });

    it('should be disabled when Nightscout URL is empty', () => {
      render(<NightscoutConfigModal {...defaultProps} />);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('should be enabled when Nightscout URL is provided', async () => {
      const user = userEvent.setup();
      render(<NightscoutConfigModal {...defaultProps} />);
      
      const urlInput = screen.getByPlaceholderText(/https:\/\/your-nightscout-site\.herokuapp\.com/i);
      await user.type(urlInput, 'https://test.nightscout.com');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeEnabled();
    });

    it('should call onSave with correct data when save button is clicked', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      
      render(<NightscoutConfigModal {...defaultProps} />);
      
      // Fill in the form
      const urlInput = screen.getByPlaceholderText(/https:\/\/your-nightscout-site\.herokuapp\.com/i);
      const secretInput = screen.getByPlaceholderText(/your api secret/i);
      const tokenInput = screen.getByPlaceholderText(/your api token/i);
      
      await user.type(urlInput, 'https://test.nightscout.com');
      await user.type(secretInput, 'test-secret');
      await user.type(tokenInput, 'test-token');
      
      // Click save button
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Verify onSave was called with correct data
      expect(mockOnSave).toHaveBeenCalledWith({
        nightscoutUrl: 'https://test.nightscout.com',
        apiSecret: 'test-secret',
        apiToken: 'test-token',
        isActive: true,
      });
    });

    it('should clean URL by removing trailing slash', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      
      render(<NightscoutConfigModal {...defaultProps} />);
      
      // Fill in URL with trailing slash
      const urlInput = screen.getByPlaceholderText(/https:\/\/your-nightscout-site\.herokuapp\.com/i);
      await user.type(urlInput, 'https://test.nightscout.com/');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Verify URL was cleaned (trailing slash removed)
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          nightscoutUrl: 'https://test.nightscout.com',
        })
      );
    });

    it('should handle empty optional fields correctly', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      
      render(<NightscoutConfigModal {...defaultProps} />);
      
      // Fill only required URL field
      const urlInput = screen.getByPlaceholderText(/https:\/\/your-nightscout-site\.herokuapp\.com/i);
      await user.type(urlInput, 'https://test.nightscout.com');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Verify onSave was called with empty optional fields
      expect(mockOnSave).toHaveBeenCalledWith({
        nightscoutUrl: 'https://test.nightscout.com',
        apiSecret: '',
        apiToken: '',
        isActive: true,
      });
    });

    it('should call onClose after successful save', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      
      render(<NightscoutConfigModal {...defaultProps} />);
      
      const urlInput = screen.getByPlaceholderText(/https:\/\/your-nightscout-site\.herokuapp\.com/i);
      await user.type(urlInput, 'https://test.nightscout.com');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Wait for the async save operation
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should display error message when save fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to save configuration';
      mockOnSave.mockRejectedValue(new Error(errorMessage));
      
      render(<NightscoutConfigModal {...defaultProps} />);
      
      const urlInput = screen.getByPlaceholderText(/https:\/\/your-nightscout-site\.herokuapp\.com/i);
      await user.type(urlInput, 'https://test.nightscout.com');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Wait for error message to appear
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
      
      // Modal should remain open
      expect(screen.getByText(/add nightscout configuration/i)).toBeInTheDocument();
    });

    it('should not call onClose when save fails', async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue(new Error('Save failed'));
      
      render(<NightscoutConfigModal {...defaultProps} />);
      
      const urlInput = screen.getByPlaceholderText(/https:\/\/your-nightscout-site\.herokuapp\.com/i);
      await user.type(urlInput, 'https://test.nightscout.com');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Wait for error to be handled
      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });
      
      // onClose should not have been called
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should validate URL format before saving', async () => {
      const user = userEvent.setup();
      
      render(<NightscoutConfigModal {...defaultProps} />);
      
      // Try to save with invalid URL (no protocol)
      const urlInput = screen.getByPlaceholderText(/https:\/\/your-nightscout-site\.herokuapp\.com/i);
      await user.type(urlInput, 'invalid-url');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/nightscout url must start with http/i)).toBeInTheDocument();
      });
      
      // onSave should not be called
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should validate URL format with http protocol', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      
      render(<NightscoutConfigModal {...defaultProps} />);
      
      // Use http URL (should be valid)
      const urlInput = screen.getByPlaceholderText(/https:\/\/your-nightscout-site\.herokuapp\.com/i);
      await user.type(urlInput, 'http://test.nightscout.com');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Should save successfully
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          nightscoutUrl: 'http://test.nightscout.com',
        })
      );
    });

    it('should respect the active checkbox state', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      
      render(<NightscoutConfigModal {...defaultProps} />);
      
      const urlInput = screen.getByPlaceholderText(/https:\/\/your-nightscout-site\.herokuapp\.com/i);
      await user.type(urlInput, 'https://test.nightscout.com');
      
      // Uncheck the active checkbox
      const activeCheckbox = screen.getByRole('checkbox', { name: /active/i });
      await user.click(activeCheckbox);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Verify isActive is false
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        })
      );
    });
  });

  describe('Integration with existing configuration', () => {
    it('should populate form with existing configuration data', () => {
      const existingConfig = {
        id: '123',
        nightscoutUrl: 'https://existing.nightscout.com',
        apiSecret: 'existing-secret',
        apiToken: 'existing-token',
        isActive: true,
      };

      render(
        <NightscoutConfigModal 
          {...defaultProps} 
          existingConfig={existingConfig}
        />
      );

      expect(screen.getByDisplayValue('https://existing.nightscout.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('existing-secret')).toBeInTheDocument();
      expect(screen.getByDisplayValue('existing-token')).toBeInTheDocument();
    });

    it('should update existing configuration when saved', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      
      const existingConfig = {
        id: '123',
        nightscoutUrl: 'https://existing.nightscout.com',
        apiSecret: 'existing-secret',
        apiToken: 'existing-token',
        isActive: true,
      };

      render(
        <NightscoutConfigModal 
          {...defaultProps} 
          existingConfig={existingConfig}
        />
      );

      // Modify the URL
      const urlInput = screen.getByDisplayValue('https://existing.nightscout.com');
      await user.clear(urlInput);
      await user.type(urlInput, 'https://updated.nightscout.com');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify updated data is passed to onSave
      expect(mockOnSave).toHaveBeenCalledWith({
        id: '123',
        nightscoutUrl: 'https://updated.nightscout.com',
        apiSecret: 'existing-secret',
        apiToken: 'existing-token',
        isActive: true,
      });
    });
  });

  describe('Loading states', () => {
    it('should show loading state during save operation', async () => {
      const user = userEvent.setup();
      // Make save operation take some time
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<NightscoutConfigModal {...defaultProps} />);
      
      const urlInput = screen.getByPlaceholderText(/https:\/\/your-nightscout-site\.herokuapp\.com/i);
      await user.type(urlInput, 'https://test.nightscout.com');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Should show loading state (button disabled)
      expect(saveButton).toBeDisabled();
      
      // Wait for save to complete
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<NightscoutConfigModal {...defaultProps} />);
      
      // Check for proper form structure
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /nightscout url/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /api secret/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /api token/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /active/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      
      render(<NightscoutConfigModal {...defaultProps} />);
      
      // Navigate using Tab key
      await user.tab();
      await user.type('https://test.nightscout.com');
      
      // Tab to save button and press Enter
      await user.tab();
      await user.tab();
      await user.tab();
      await user.tab(); // Skip test connection button
      await user.keyboard('{Enter}');
      
      expect(mockOnSave).toHaveBeenCalled();
    });
  });
});

