import React, { useState, useEffect } from 'react';
// Removed nightscoutConfigApi import - using global configuration now

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
      password: ''
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadExistingConfig();
    }
  }, [isOpen]);

  const loadExistingConfig = async () => {
    try {
      setIsLoading(true);
      // Note: Nightscout configuration is now handled globally via environment variables
      console.log('Nightscout configuration should be set via environment variables');
      
      // Load LibreLinkUp config from localStorage if available
      const savedLibreConfig = localStorage.getItem('libre_config');
      if (savedLibreConfig) {
        const libreConfig = JSON.parse(savedLibreConfig);
        setConfig(prev => ({
          ...prev,
          dataSource: 'libre',
          libre: {
            email: libreConfig.email || '',
            password: libreConfig.password || ''
          }
        }));
      }
    } catch (error) {
      console.error('Failed to load existing config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (config.dataSource === 'nightscout') {
        // Note: Nightscout configuration is now handled globally via environment variables
        console.log('Nightscout configuration should be set via environment variables:');
        console.log('NIGHTSCOUT_URL=' + config.nightscout.url);
        console.log('NIGHTSCOUT_API_SECRET=' + config.nightscout.secret);
        if (config.nightscout.token) {
          console.log('NIGHTSCOUT_API_TOKEN=' + config.nightscout.token);
        }
      } else {
        // For LibreLinkUp, we'll store it in localStorage for now
        // In a production app, you might want to store this in the backend
        localStorage.setItem('libre_config', JSON.stringify({
          email: config.libre.email,
          password: config.libre.password
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
                      Global Nightscout configuration via environment variables
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Configure via NIGHTSCOUT_URL, NIGHTSCOUT_API_SECRET, NIGHTSCOUT_API_TOKEN
                    </div>
                  </div>
                  <div className="text-2xl ml-3">🌙</div>
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
                  <div className="text-2xl ml-3">🩸</div>
                </label>
              </div>
            </div>

            {/* Configuration Fields */}
            {config.dataSource === 'nightscout' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Global Configuration
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Nightscout is now configured globally via environment variables on the backend server.</p>
                      <p className="mt-2">To configure Nightscout, set these environment variables:</p>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        <li><code className="bg-blue-100 px-1 rounded">NIGHTSCOUT_URL</code> - Your Nightscout site URL</li>
                        <li><code className="bg-blue-100 px-1 rounded">NIGHTSCOUT_API_SECRET</code> - Your API secret</li>
                        <li><code className="bg-blue-100 px-1 rounded">NIGHTSCOUT_API_TOKEN</code> - Your API token (optional)</li>
                      </ul>
                      <p className="mt-2">Contact your system administrator to configure these settings.</p>
                    </div>
                  </div>
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

