import React, { useState, useEffect } from 'react';
import { userDataSourceConfigApi, DataSourceConfigRequest } from '../services/userDataSourceConfigApi';
import { libreApiService } from '../services/libreApi';

interface DataSourceConfig {
  dataSource: 'nightscout' | 'libre';
  nightscout: {
    url: string;
    secret: string;
    token?: string;
  };
  libre: {
    email: string;
    password: string;
    patientId: string;
  };
}

interface DataSourceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: DataSourceConfig) => Promise<void>;
  logout?: () => void;
}

const DataSourceConfigModal: React.FC<DataSourceConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  logout
}) => {
  const [config, setConfig] = useState<DataSourceConfig>({
    dataSource: 'nightscout',
    nightscout: {
      url: '',
      secret: '',
      token: ''
    },
    libre: {
      email: '',
      password: '',
      patientId: ''
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libreTestResult, setLibreTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTestingLibre, setIsTestingLibre] = useState(false);
  const [nightscoutTestResult, setNightscoutTestResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );
  const [isTestingNightscout, setIsTestingNightscout] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLibreTestResult(null);
      setNightscoutTestResult(null);
      loadExistingConfig();
    }
  }, [isOpen]);

  const loadExistingConfig = async () => {
    try {
      setIsLoading(true);
      
      // Load user-specific configurations from backend
      const configStatus = await userDataSourceConfigApi.getConfigStatus();
      
      if (configStatus.hasAnyConfig) {
        // Prefer active Nightscout when present; otherwise last used or first active config
        const preferredConfig =
          configStatus.activeNightscoutConfig ||
          configStatus.mostRecentlyUsedConfig ||
          configStatus.allConfigs[0];
        
        if (preferredConfig.dataSource === 'NIGHTSCOUT') {
          setConfig(prev => ({
            ...prev,
            dataSource: 'nightscout',
            nightscout: {
              url: preferredConfig.nightscoutUrl || '',
              secret: preferredConfig.nightscoutApiSecret || '',
              token: preferredConfig.nightscoutApiToken || ''
            }
          }));
        } else if (preferredConfig.dataSource === 'LIBRE_LINK_UP') {
          setConfig(prev => ({
            ...prev,
            dataSource: 'libre',
            libre: {
              email: preferredConfig.libreEmail || '',
              password: preferredConfig.librePassword || '',
              patientId: preferredConfig.librePatientId || ''
            }
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load existing config:', error);
      // Keep Nightscout as the selected source; only prefill Libre fields from localStorage
      const savedLibreConfig = localStorage.getItem('libre_config');
      if (savedLibreConfig) {
        const libreConfig = JSON.parse(savedLibreConfig);
        setConfig(prev => ({
          ...prev,
          dataSource: 'nightscout',
          libre: {
            email: libreConfig.email || '',
            password: libreConfig.password || '',
            patientId: libreConfig.patientId || ''
          }
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Create the configuration request for the backend
      const configRequest: DataSourceConfigRequest = {
        dataSource: config.dataSource === 'nightscout' ? 'NIGHTSCOUT' : 'LIBRE_LINK_UP',
        isActive: true
      };

      if (config.dataSource === 'nightscout') {
        configRequest.nightscoutUrl = config.nightscout.url;
        configRequest.nightscoutApiSecret = config.nightscout.secret;
        configRequest.nightscoutApiToken = config.nightscout.token || '';
      } else {
        configRequest.libreEmail = config.libre.email;
        configRequest.librePassword = config.libre.password;
        configRequest.librePatientId = config.libre.patientId?.trim() || '';
      }

      // Save configuration to backend
      await userDataSourceConfigApi.saveConfig(configRequest);
      
      // Also save LibreLinkUp to localStorage as backup
      if (config.dataSource === 'libre') {
        localStorage.setItem('libre_config', JSON.stringify({
          email: config.libre.email,
          password: config.libre.password,
          patientId: config.libre.patientId?.trim() || ''
        }));
      }

      await onSave(config);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to save configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataSourceChange = (dataSource: 'nightscout' | 'libre') => {
    setConfig(prev => ({
      ...prev,
      dataSource
    }));
    setError(null);
    setLibreTestResult(null);
    setNightscoutTestResult(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [prev.dataSource]: {
        ...prev[prev.dataSource],
        [field]: value
      }
    }));
    setError(null);
    setLibreTestResult(null);
    setNightscoutTestResult(null);
  };

  const handleTestNightscoutConnection = async () => {
    setNightscoutTestResult(null);
    setIsTestingNightscout(true);
    try {
      const result = await userDataSourceConfigApi.testNightscoutConnection({
        nightscoutUrl: config.nightscout.url,
        nightscoutApiSecret: config.nightscout.secret,
        nightscoutApiToken: config.nightscout.token,
      });
      setNightscoutTestResult(result);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : 'Nightscout connection test failed.';
      setNightscoutTestResult({ ok: false, message });
    } finally {
      setIsTestingNightscout(false);
    }
  };

  const handleTestLibreConnection = async () => {
    setLibreTestResult(null);
    setIsTestingLibre(true);
    try {
      const result = await libreApiService.testConnection(
        config.libre.email,
        config.libre.password,
        config.libre.patientId
      );
      setLibreTestResult(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Libre Link Up connection test failed.';
      setLibreTestResult({ ok: false, message });
    } finally {
      setIsTestingLibre(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Configure Data Source
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Data Source Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Choose Data Source
              </label>
              
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="dataSource"
                    value="nightscout"
                    checked={config.dataSource === 'nightscout'}
                    onChange={() => handleDataSourceChange('nightscout')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Nightscout</div>
                    <div className="text-sm text-gray-500">
                      Connect to your Nightscout instance for comprehensive glucose monitoring
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    NS
                  </div>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="dataSource"
                    value="libre"
                    checked={config.dataSource === 'libre'}
                    onChange={() => handleDataSourceChange('libre')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">LibreLinkUp</div>
                    <div className="text-sm text-gray-500">
                      Connect directly to Abbott's LibreLinkUp service
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    LLU
                  </div>
                </label>
              </div>
            </div>

            {/* Configuration Fields */}
            {config.dataSource === 'nightscout' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nightscout URL
                  </label>
                  <input
                    type="url"
                    value={config.nightscout.url}
                    onChange={(e) => handleInputChange('url', e.target.value)}
                    placeholder="https://your-nightscout.herokuapp.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Secret
                  </label>
                  <input
                    type="password"
                    value={config.nightscout.secret}
                    onChange={(e) => handleInputChange('secret', e.target.value)}
                    placeholder="Your Nightscout API secret"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Token (Optional)
                  </label>
                  <input
                    type="password"
                    value={config.nightscout.token || ''}
                    onChange={(e) => handleInputChange('token', e.target.value)}
                    placeholder="Your Nightscout API token"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleTestNightscoutConnection}
                    disabled={isTestingNightscout || !config.nightscout.url.trim()}
                    className="w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTestingNightscout ? 'Testing...' : 'Test connection'}
                  </button>
                  {nightscoutTestResult && (
                    <p
                      className={`mt-2 text-sm ${
                        nightscoutTestResult.ok ? 'text-green-700' : 'text-red-700'
                      }`}
                      role="status"
                    >
                      {nightscoutTestResult.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {config.dataSource === 'libre' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LibreLinkUp Email
                  </label>
                  <input
                    type="email"
                    value={config.libre.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="your_email@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={config.libre.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Your LibreLinkUp password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient ID (connection)
                  </label>
                  <input
                    type="text"
                    value={config.libre.patientId}
                    onChange={(e) => handleInputChange('patientId', e.target.value)}
                    placeholder="e.g. from GET /api/libre/connections -> patientId"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Optional. When set, glucose calls use this connection; otherwise the app may use the first connection.
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleTestLibreConnection}
                    disabled={
                      isTestingLibre ||
                      !config.libre.email.trim() ||
                      !config.libre.password
                    }
                    className="w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTestingLibre ? 'Testing...' : 'Test connection'}
                  </button>
                  {libreTestResult && (
                    <p
                      className={`mt-2 text-sm ${
                        libreTestResult.ok ? 'text-green-700' : 'text-red-700'
                      }`}
                      role="status"
                    >
                      {libreTestResult.message}
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        <strong>Note:</strong> Your LibreLinkUp credentials are stored locally and used to fetch glucose data directly from Abbott's service.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                {logout && (
                  <button
                    type="button"
                    onClick={logout}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={isLoading}
                  >
                    Logout
                  </button>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DataSourceConfigModal;

