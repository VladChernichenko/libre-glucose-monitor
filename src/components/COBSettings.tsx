import React, { useState, useEffect, useCallback } from 'react';
import { COBConfig } from '../services/carbsOnBoard';
import { cobSettingsApi, COBSettingsData } from '../services/cobSettingsApi';

interface COBSettingsProps {
  config: COBConfig;
  onConfigChange: (config: COBConfig) => void;
  onClose: () => void;
}

// Local config type that allows empty values during editing
type LocalCOBConfig = {
  carbRatio: number | '';
  isf: number | '';
  carbHalfLife: number | '';
  maxCOBDuration: number | '';
};

const COBSettings: React.FC<COBSettingsProps> = ({ config, onConfigChange, onClose }) => {
  const [localConfig, setLocalConfig] = useState<LocalCOBConfig>({
    carbRatio: config.carbRatio,
    isf: config.isf,
    carbHalfLife: config.carbHalfLife,
    maxCOBDuration: config.maxCOBDuration
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettingsFromBackend = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const backendSettings = await cobSettingsApi.getCOBSettings();
      
      // Convert backend settings to frontend config format
      const frontendConfig: LocalCOBConfig = {
        carbRatio: backendSettings.carbRatio,
        isf: backendSettings.isf,
        carbHalfLife: backendSettings.carbHalfLife,
        maxCOBDuration: backendSettings.maxCOBDuration
      };
      
      setLocalConfig(frontendConfig);
      setIsDirty(false);
    } catch (error) {
      console.error('Error loading COB settings from backend:', error);
      setError('Failed to load settings from server');
      // Fall back to local config
      setLocalConfig(config);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    loadSettingsFromBackend();
  }, [loadSettingsFromBackend]);

  // Add ESC key handler to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Add event listener when component mounts
    document.addEventListener('keydown', handleEscKey);

    // Cleanup event listener when component unmounts
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  const handleInputChange = (field: keyof LocalCOBConfig, value: string) => {
    const numericValue = value === '' ? '' : parseFloat(value);
    if (numericValue !== '' && !isNaN(numericValue)) {
      setLocalConfig(prev => ({ ...prev, [field]: numericValue }));
      setIsDirty(true);
    } else if (value === '') {
      setLocalConfig(prev => ({ ...prev, [field]: '' }));
      setIsDirty(true);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Validate that all fields have valid values
      if (localConfig.carbRatio === '' || localConfig.isf === '' || localConfig.carbHalfLife === '' || localConfig.maxCOBDuration === '') {
        setError('All fields must have valid values');
        return;
      }
      
      // Convert local config to proper COBConfig format
      const validConfig: COBConfig = {
        carbRatio: localConfig.carbRatio as number,
        isf: localConfig.isf as number,
        carbHalfLife: localConfig.carbHalfLife as number,
        maxCOBDuration: localConfig.maxCOBDuration as number
      };
      
      // Convert frontend config to backend format
      const backendSettings: COBSettingsData = {
        carbRatio: validConfig.carbRatio,
        isf: validConfig.isf,
        carbHalfLife: validConfig.carbHalfLife,
        maxCOBDuration: validConfig.maxCOBDuration
      };
      
      await cobSettingsApi.saveCOBSettings(backendSettings);
      
      // Update parent component
      onConfigChange(validConfig);
      setIsDirty(false);
      onClose();
    } catch (error) {
      console.error('Error saving COB settings to backend:', error);
      setError('Failed to save settings to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setLocalConfig({
      carbRatio: config.carbRatio,
      isf: config.isf,
      carbHalfLife: config.carbHalfLife,
      maxCOBDuration: config.maxCOBDuration
    });
    setIsDirty(false);
    onClose();
  };

  const handleReset = () => {
    const defaultConfig: LocalCOBConfig = {
      carbRatio: 2.0,
      isf: 1.0,
      carbHalfLife: 45,
      maxCOBDuration: 240
    };
    setLocalConfig(defaultConfig);
    setIsDirty(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">🍞 COB Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading settings...</span>
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
          {/* Carb Ratio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Carb Ratio (mmol/L per 10g)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="10"
                value={localConfig.carbRatio || ''}
                onChange={(e) => handleInputChange('carbRatio', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="2.0"
              />
              <div className="absolute right-3 top-2 text-sm text-gray-500">mmol/L</div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              How much 10 grams of carbohydrates will increase blood sugar in mmol/L
            </p>
          </div>

          {/* Insulin Sensitivity Factor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Insulin Sensitivity Factor (mmol/L/u)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={localConfig.isf || ''}
                onChange={(e) => handleInputChange('isf', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1.0"
              />
              <div className="absolute right-3 top-2 text-sm text-gray-500">mmol/L/u</div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              How much 1 unit of insulin lowers your glucose
            </p>
          </div>

          {/* Carb Half-Life */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Carb Half-Life (minutes)
            </label>
            <div className="relative">
              <input
                type="number"
                step="5"
                min="15"
                max="240"
                value={localConfig.carbHalfLife || ''}
                onChange={(e) => handleInputChange('carbHalfLife', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="45"
              />
              <div className="absolute right-3 top-2 text-sm text-gray-500">min</div>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-500">
                <span className="font-medium">15-30 min:</span> Rapid-acting (sugar, white bread)
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-medium">45-90 min:</span> Medium-acting (pasta, rice)
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-medium">120-240 min:</span> Slow-acting (fiber-rich)
              </p>
            </div>
          </div>

          {/* Max COB Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max COB Tracking Duration (hours)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="1"
                max="8"
                value={localConfig.maxCOBDuration ? localConfig.maxCOBDuration / 60 : ''}
                onChange={(e) => {
                  const hours = e.target.value === '' ? '' : parseFloat(e.target.value);
                  if (hours !== '' && !isNaN(hours)) {
                    handleInputChange('maxCOBDuration', (hours * 60).toString());
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="4"
              />
              <div className="absolute right-3 top-2 text-sm text-gray-500">hours</div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              How long to track carbs on board (affects performance)
            </p>
          </div>

          {/* Current Values Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current Values</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Carb Ratio:</span>
                <span className="ml-2 font-medium">{localConfig.carbRatio || 'Not set'} mmol/L per 10g</span>
              </div>
              <div>
                <span className="text-gray-500">ISF:</span>
                <span className="ml-2 font-medium">{localConfig.isf || 'Not set'} mmol/L/u</span>
              </div>
              <div>
                <span className="text-gray-500">Half-Life:</span>
                <span className="ml-2 font-medium">{localConfig.carbHalfLife || 'Not set'} min</span>
              </div>
              <div>
                <span className="text-gray-500">Max Duration:</span>
                <span className="ml-2 font-medium">{localConfig.maxCOBDuration ? localConfig.maxCOBDuration / 60 : 'Not set'} hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="text-gray-600 hover:text-gray-800 transition-colors text-sm"
          >
            Reset to Defaults
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || isLoading}
              className={`px-4 py-2 rounded-md transition-colors ${
                isDirty && !isLoading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default COBSettings;
