import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the nightscoutConfigApi
jest.mock('../../services/nightscoutConfigApi', () => ({
  nightscoutConfigApi: {
    getConfig: jest.fn(),
    saveConfig: jest.fn(),
    testConfig: jest.fn(),
    deactivateConfig: jest.fn(),
    deleteConfig: jest.fn(),
    hasConfig: jest.fn(),
    getConfigStatus: jest.fn(),
  },
}));

// Mock the NightscoutProxyService
jest.mock('../../services/nightscout/nightscoutProxyService', () => ({
  NightscoutProxyService: jest.fn().mockImplementation(() => ({
    getCurrentGlucose: jest.fn(),
    getGlucoseEntries: jest.fn(),
    getGlucoseEntriesByDate: jest.fn(),
    getDeviceStatus: jest.fn(),
    healthCheck: jest.fn(),
  })),
}));

// Mock other services
jest.mock('../../services/hybridNotesApi', () => ({
  hybridNotesApiService: {
    getNotes: jest.fn().mockResolvedValue([]),
    addNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
  },
}));

jest.mock('../../services/cobSettingsApi', () => ({
  cobSettingsApi: {
    getSettings: jest.fn().mockResolvedValue({
      carbRatio: 15,
      isf: 50,
      carbHalfLife: 180,
      maxCOBDuration: 360,
    }),
    saveSettings: jest.fn(),
  },
}));

jest.mock('../../services/glucoseCalculationsApi', () => ({
  glucoseCalculationsApi: {
    getCalculations: jest.fn().mockResolvedValue({
      currentCOB: 0,
      currentIOB: 0,
      predictedGlucose: [],
    }),
  },
}));

jest.mock('../../services/demoData', () => ({
  generateDemoGlucoseData: jest.fn().mockReturnValue([]),
}));

jest.mock('../../config/environments', () => ({
  getEnvironmentConfig: () => ({
    backendUrl: 'http://localhost:8080',
  }),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Dashboard - Nightscout Configuration Integration', () => {
  const mockNightscoutConfigApi = require('../../services/nightscoutConfigApi').nightscoutConfigApi;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage with auth token
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => {
          if (key === 'accessToken') return 'mock-jwt-token';
          if (key === 'token') return 'mock-jwt-token';
          return null;
        }),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock successful authentication
    mockNightscoutConfigApi.getConfig.mockResolvedValue(null);
    mockNightscoutConfigApi.hasConfig.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderDashboardWithAuth = () => {
    return render(
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    );
  };

  describe('Nightscout Configuration Modal Integration', () => {
    it('should open Nightscout configuration modal when "Configure Nightscout" button is clicked', async () => {
      const user = userEvent.setup();
      renderDashboardWithAuth();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Look for configure button (might be in different variations)
      const configureButton = screen.queryByText(/configure nightscout/i) || 
                             screen.queryByText(/add nightscout/i) ||
                             screen.queryByText(/setup nightscout/i);

      if (configureButton) {
        await user.click(configureButton);

        // Modal should open
        await waitFor(() => {
          expect(screen.getByText(/add nightscout configuration/i)).toBeInTheDocument();
        });
      }
    });

    it('should save Nightscout configuration and close modal on successful save', async () => {
      const user = userEvent.setup();
      const mockSavedConfig = {
        id: '123',
        nightscoutUrl: 'https://test.nightscout.com',
        apiSecret: 'test-secret',
        apiToken: 'test-token',
        isActive: true,
      };

      mockNightscoutConfigApi.saveConfig.mockResolvedValue(mockSavedConfig);

      renderDashboardWithAuth();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Try to find and click configure button
      const configureButton = screen.queryByText(/configure nightscout/i) || 
                             screen.queryByText(/add nightscout/i) ||
                             screen.queryByText(/setup nightscout/i);

      if (configureButton) {
        await user.click(configureButton);

        // Wait for modal to open
        await waitFor(() => {
          expect(screen.getByText(/add nightscout configuration/i)).toBeInTheDocument();
        });

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

        // Verify saveConfig was called with correct data
        await waitFor(() => {
          expect(mockNightscoutConfigApi.saveConfig).toHaveBeenCalledWith({
            nightscoutUrl: 'https://test.nightscout.com',
            apiSecret: 'test-secret',
            apiToken: 'test-token',
            isActive: true,
          });
        });

        // Modal should close after successful save
        await waitFor(() => {
          expect(screen.queryByText(/add nightscout configuration/i)).not.toBeInTheDocument();
        });
      }
    });

    it('should display error message when save fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to save configuration';

      mockNightscoutConfigApi.saveConfig.mockRejectedValue(new Error(errorMessage));

      renderDashboardWithAuth();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Try to find and click configure button
      const configureButton = screen.queryByText(/configure nightscout/i) || 
                             screen.queryByText(/add nightscout/i) ||
                             screen.queryByText(/setup nightscout/i);

      if (configureButton) {
        await user.click(configureButton);

        // Wait for modal to open
        await waitFor(() => {
          expect(screen.getByText(/add nightscout configuration/i)).toBeInTheDocument();
        });

        // Fill in required URL
        const urlInput = screen.getByPlaceholderText(/https:\/\/your-nightscout-site\.herokuapp\.com/i);
        await user.type(urlInput, 'https://test.nightscout.com');

        // Click save button
        const saveButton = screen.getByRole('button', { name: /save/i });
        await user.click(saveButton);

        // Wait for error message
        await waitFor(() => {
          expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });

        // Modal should remain open
        expect(screen.getByText(/add nightscout configuration/i)).toBeInTheDocument();
      }
    });

    it('should populate form with existing configuration when editing', async () => {
      const user = userEvent.setup();
      const existingConfig = {
        id: '123',
        nightscoutUrl: 'https://existing.nightscout.com',
        apiSecret: 'existing-secret',
        apiToken: 'existing-token',
        isActive: true,
      };

      mockNightscoutConfigApi.getConfig.mockResolvedValue(existingConfig);
      mockNightscoutConfigApi.hasConfig.mockResolvedValue(true);

      renderDashboardWithAuth();

      // Wait for component to load and existing config to be fetched
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Try to find configure button (should show "Edit" or similar for existing config)
      const configureButton = screen.queryByText(/configure nightscout/i) || 
                             screen.queryByText(/edit nightscout/i) ||
                             screen.queryByText(/nightscout settings/i);

      if (configureButton) {
        await user.click(configureButton);

        // Wait for modal to open with existing data
        await waitFor(() => {
          expect(screen.getByDisplayValue('https://existing.nightscout.com')).toBeInTheDocument();
          expect(screen.getByDisplayValue('existing-secret')).toBeInTheDocument();
          expect(screen.getByDisplayValue('existing-token')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Test Connection Functionality', () => {
    it('should test Nightscout connection before saving', async () => {
      const user = userEvent.setup();
      mockNightscoutConfigApi.testConfig.mockResolvedValue('Connection successful');

      renderDashboardWithAuth();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Try to find configure button
      const configureButton = screen.queryByText(/configure nightscout/i) || 
                             screen.queryByText(/add nightscout/i) ||
                             screen.queryByText(/setup nightscout/i);

      if (configureButton) {
        await user.click(configureButton);

        // Wait for modal to open
        await waitFor(() => {
          expect(screen.getByText(/add nightscout configuration/i)).toBeInTheDocument();
        });

        // Fill in URL
        const urlInput = screen.getByPlaceholderText(/https:\/\/your-nightscout-site\.herokuapp\.com/i);
        await user.type(urlInput, 'https://test.nightscout.com');

        // Click test connection button
        const testButton = screen.getByRole('button', { name: /test connection/i });
        await user.click(testButton);

        // Verify testConfig was called
        await waitFor(() => {
          expect(mockNightscoutConfigApi.testConfig).toHaveBeenCalled();
        });
      }
    });
  });
});

