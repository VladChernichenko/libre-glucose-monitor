import React, { useState, useEffect } from 'react';
import { getEnvironmentConfig } from '../config/environments';

interface NightscoutConfig {
  id?: string;
  nightscoutUrl: string;
  apiSecret?: string;
  apiToken?: string;
  isActive?: boolean;
  lastUsed?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface NightscoutConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: NightscoutConfig) => Promise<void>;
  existingConfig?: NightscoutConfig | null;
}

const NightscoutConfigModal: React.FC<NightscoutConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingConfig
}) => {
  const [formData, setFormData] = useState<NightscoutConfig>({
    nightscoutUrl: '',
    apiSecret: '',
    apiToken: '',
    isActive: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (existingConfig) {
        setFormData({
          nightscoutUrl: existingConfig.nightscoutUrl || '',
          apiSecret: existingConfig.apiSecret || '',
          apiToken: existingConfig.apiToken || '',
          isActive: existingConfig.isActive ?? true
        });
      } else {
        setFormData({
          nightscoutUrl: '',
          apiSecret: '',
          apiToken: '',
          isActive: true
        });
      }
      setError(null);
    }
  }, [isOpen, existingConfig]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔧 NightscoutConfigModal: handleSubmit called');
    console.log('🔧 NightscoutConfigModal: Form data:', formData);
    console.log('🔧 NightscoutConfigModal: Event:', e);
    console.log('🔧 NightscoutConfigModal: Starting validation and save process...');
    setIsLoading(true);
    setError(null);

    try {
      // Validate URL format
      if (!formData.nightscoutUrl) {
        throw new Error('Nightscout URL is required');
      }

      if (!formData.nightscoutUrl.startsWith('http://') && !formData.nightscoutUrl.startsWith('https://')) {
        throw new Error('Nightscout URL must start with http:// or https://');
      }

      // Remove trailing slash if present
      const cleanUrl = formData.nightscoutUrl.replace(/\/$/, '');
      
      const configToSave = {
        ...formData,
        nightscoutUrl: cleanUrl
      };

      console.log('🔧 NightscoutConfigModal: Calling onSave with config:', configToSave);
      console.log('🔧 NightscoutConfigModal: onSave function:', onSave);
      await onSave(configToSave);
      console.log('🔧 NightscoutConfigModal: onSave completed successfully, closing modal');
      onClose();
    } catch (err) {
      console.error('🔧 NightscoutConfigModal: Error in handleSubmit:', err);
      let errorMessage = 'An error occurred';
      
      if (err instanceof Error) {
        if (err.message.includes('not authenticated') || err.message.includes('403')) {
          errorMessage = 'Please log in to save Nightscout configuration. Click "Login" in the top navigation.';
        } else if (err.message.includes('Failed to save')) {
          errorMessage = 'Failed to save configuration. Please check your Nightscout URL and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate form data before testing
      if (!formData.nightscoutUrl || formData.nightscoutUrl.trim() === '') {
        throw new Error('Please enter a Nightscout URL before testing');
      }

      // Clean URL
      const cleanUrl = formData.nightscoutUrl.trim().replace(/\/$/, '');
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        throw new Error('Nightscout URL must start with http:// or https://');
      }

      const config = getEnvironmentConfig();
      const response = await fetch(`${config.backendUrl}/api/nightscout/config/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          nightscoutUrl: cleanUrl,
          apiSecret: formData.apiSecret || null,
          apiToken: formData.apiToken || null
        })
      });

      if (response.ok) {
        const successMessage = await response.text();
        alert(`✅ ${successMessage}`);
      } else {
        const errorData = await response.text();
        throw new Error(errorData || 'Connection test failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {existingConfig ? 'Edit Nightscout Configuration' : 'Add Nightscout Configuration'}
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

        <form 
          onSubmit={(e) => {
            console.log('🔧 Form onSubmit triggered!', e);
            console.log('🔧 Form data at submission:', formData);
            console.log('🔧 Form validation - URL:', formData.nightscoutUrl);
            console.log('🔧 Form onSubmit - calling handleSubmit...');
            handleSubmit(e);
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="nightscoutUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Nightscout URL *
            </label>
            <input
              type="url"
              id="nightscoutUrl"
              name="nightscoutUrl"
              value={formData.nightscoutUrl}
              onChange={(e) => {
                console.log('🔧 URL input changed:', e.target.value);
                handleInputChange(e);
              }}
              placeholder="https://your-nightscout-site.herokuapp.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your Nightscout site URL (without trailing slash)
            </p>
          </div>

          <div>
            <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-700 mb-1">
              API Secret
            </label>
            <div className="relative">
              <input
                type={showSecrets ? "text" : "password"}
                id="apiSecret"
                name="apiSecret"
                value={formData.apiSecret}
                onChange={handleInputChange}
                placeholder="Your API secret (optional)"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                {showSecrets ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              API secret for authentication (if required by your Nightscout site)
            </p>
          </div>

          <div>
            <label htmlFor="apiToken" className="block text-sm font-medium text-gray-700 mb-1">
              API Token
            </label>
            <div className="relative">
              <input
                type={showSecrets ? "text" : "password"}
                id="apiToken"
                name="apiToken"
                value={formData.apiToken}
                onChange={handleInputChange}
                placeholder="Your API token (optional)"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                {showSecrets ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Bearer token for authentication (alternative to API secret)
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              Active (use this configuration for API calls)
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isLoading || !formData.nightscoutUrl}
              className="flex-1 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="button"
              onClick={async () => {
                console.log('🔧 Direct Save button clicked!');
                console.log('🔧 Form data:', formData);
                console.log('🔧 onSave function:', onSave);
                try {
                  const configToSave = {
                    ...formData,
                    nightscoutUrl: formData.nightscoutUrl.replace(/\/$/, '')
                  };
                  console.log('🔧 Calling onSave directly with:', configToSave);
                  await onSave(configToSave);
                  console.log('🔧 Direct save completed, closing modal');
                  onClose();
                } catch (error) {
                  console.error('🔧 Direct save error:', error);
                  setError(error instanceof Error ? error.message : 'Save failed');
                }
              }}
              disabled={isLoading || !formData.nightscoutUrl}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Direct Save'}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              onClick={(e) => {
                console.log('🔧 Submit button clicked!', e);
                console.log('🔧 Form data at button click:', formData);
                // Don't prevent default - let the form handle submission
              }}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : (existingConfig ? 'Update' : 'Save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NightscoutConfigModal;

