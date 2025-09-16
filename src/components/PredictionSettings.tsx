import React, { useState, useEffect } from 'react';
import { PredictionConfig, glucosePredictionService } from '../services/glucosePrediction';

interface PredictionSettingsProps {
  config: PredictionConfig;
  onConfigChange: (config: PredictionConfig) => void;
  onClose: () => void;
}

const PredictionSettings: React.FC<PredictionSettingsProps> = ({
  config,
  onConfigChange,
  onClose
}) => {
  const [localConfig, setLocalConfig] = useState<PredictionConfig>(config);
  const [activeTab, setActiveTab] = useState<'carbs' | 'insulin' | 'glucose'>('carbs');

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    onConfigChange(localConfig);
    onClose();
  };

  const handleReset = () => {
    const defaultConfig = new (glucosePredictionService.constructor as any)().getConfig();
    setLocalConfig(defaultConfig);
  };

  const updateConfig = (field: keyof PredictionConfig, value: number) => {
    setLocalConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">🔮 Prediction Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {[
              { id: 'carbs', label: '🍞 Carbs', icon: '🍞' },
              { id: 'insulin', label: '💉 Insulin', icon: '💉' },
              { id: 'glucose', label: '📊 Glucose', icon: '📊' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {activeTab === 'carbs' && (
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-800 mb-3">Carbohydrate Parameters</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Absorption Rate (g/hour)
                  </label>
                  <input
                    type="number"
                    value={localConfig.carbAbsorptionRate}
                    onChange={(e) => updateConfig('carbAbsorptionRate', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="10"
                    max="60"
                    step="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">How fast carbs are absorbed (typical: 20-40 g/hour)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Glucose Impact (mmol/L per gram)
                  </label>
                  <input
                    type="number"
                    value={localConfig.carbGlucoseRatio}
                    onChange={(e) => updateConfig('carbGlucoseRatio', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0.1"
                    max="0.5"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">How much 1g carbs raises glucose (typical: 0.2-0.4)</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'insulin' && (
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-800 mb-3">Insulin Parameters</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sensitivity Factor (mmol/L per unit)
                  </label>
                  <input
                    type="number"
                    value={localConfig.insulinSensitivityFactor}
                    onChange={(e) => updateConfig('insulinSensitivityFactor', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="8"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">How much 1 unit lowers glucose (typical: 2-4 mmol/L)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peak Time (hours)
                  </label>
                  <input
                    type="number"
                    value={localConfig.insulinPeakTime}
                    onChange={(e) => updateConfig('insulinPeakTime', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0.5"
                    max="3"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">When insulin peaks (rapid-acting: 1-2h)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action Duration (hours)
                  </label>
                  <input
                    type="number"
                    value={localConfig.insulinActionDuration}
                    onChange={(e) => updateConfig('insulinActionDuration', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="2"
                    max="8"
                    step="0.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">How long insulin works (rapid-acting: 3-5h)</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'glucose' && (
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-800 mb-3">Glucose Metabolism Parameters</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Basal Decline (mmol/L per hour)
                  </label>
                  <input
                    type="number"
                    value={localConfig.basalGlucoseDecline}
                    onChange={(e) => updateConfig('basalGlucoseDecline', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="0.5"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">Natural glucose decline without food/insulin</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Volatility (mmol/L)
                  </label>
                  <input
                    type="number"
                    value={localConfig.glucoseVolatility}
                    onChange={(e) => updateConfig('glucoseVolatility', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0.1"
                    max="2"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Natural glucose fluctuation range</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Prediction (hours)
                  </label>
                  <input
                    type="number"
                    value={localConfig.maxPredictionHours}
                    onChange={(e) => updateConfig('maxPredictionHours', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="12"
                    step="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum hours to predict ahead</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prediction Interval (minutes)
                  </label>
                  <input
                    type="number"
                    value={localConfig.predictionInterval}
                    onChange={(e) => updateConfig('predictionInterval', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="5"
                    max="60"
                    step="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Time between prediction points</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Reset to Defaults
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionSettings;
