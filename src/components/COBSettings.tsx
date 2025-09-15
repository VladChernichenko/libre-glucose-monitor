import React, { useState, useEffect } from 'react';
import { COBConfig } from '../services/carbsOnBoard';

interface COBSettingsProps {
  config: COBConfig;
  onConfigChange: (config: COBConfig) => void;
  onClose: () => void;
}

const COBSettings: React.FC<COBSettingsProps> = ({ config, onConfigChange, onClose }) => {
  const [localConfig, setLocalConfig] = useState<COBConfig>(config);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
    setIsDirty(false);
  }, [config]);

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

  const handleInputChange = (field: keyof COBConfig, value: number) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    setIsDirty(false);
    onClose();
  };

  const handleCancel = () => {
    setLocalConfig(config);
    setIsDirty(false);
    onClose();
  };

  const handleReset = () => {
    const defaultConfig: COBConfig = {
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
                value={localConfig.carbRatio}
                onChange={(e) => handleInputChange('carbRatio', parseFloat(e.target.value) || 0)}
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
                value={localConfig.isf}
                onChange={(e) => handleInputChange('isf', parseFloat(e.target.value) || 0)}
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
                value={localConfig.carbHalfLife}
                onChange={(e) => handleInputChange('carbHalfLife', parseInt(e.target.value) || 0)}
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
                value={localConfig.maxCOBDuration / 60}
                onChange={(e) => handleInputChange('maxCOBDuration', (parseFloat(e.target.value) || 0) * 60)}
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
                <span className="ml-2 font-medium">{localConfig.carbRatio} mmol/L per 10g</span>
              </div>
              <div>
                <span className="text-gray-500">ISF:</span>
                <span className="ml-2 font-medium">{localConfig.isf} mmol/L/u</span>
              </div>
              <div>
                <span className="text-gray-500">Half-Life:</span>
                <span className="ml-2 font-medium">{localConfig.carbHalfLife} min</span>
              </div>
              <div>
                <span className="text-gray-500">Max Duration:</span>
                <span className="ml-2 font-medium">{localConfig.maxCOBDuration / 60} hours</span>
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
              disabled={!isDirty}
              className={`px-4 py-2 rounded-md transition-colors ${
                isDirty
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default COBSettings;
