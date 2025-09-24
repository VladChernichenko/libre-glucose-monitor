import React from 'react';
import { GlucoseNote } from '../types/notes';
import { glucosePredictionService } from '../services/glucosePrediction';

interface GlucosePredictionProps {
  currentGlucose?: number;
  notes: GlucoseNote[];
  className?: string;
}

const GlucosePrediction: React.FC<GlucosePredictionProps> = ({
  currentGlucose,
  notes,
  className = ''
}) => {
  if (!currentGlucose) {
    return (
      <div className={`bg-gray-50 rounded-lg p-3 ${className}`}>
        <div className="text-center">
          <div className="text-gray-400 text-sm mb-1">🔮</div>
          <p className="text-gray-500 text-xs">No current glucose data</p>
        </div>
      </div>
    );
  }

  const prediction = glucosePredictionService.getTwoHourPrediction(
    currentGlucose,
    new Date(),
    notes
  );

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return '📈';
      case 'falling': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'rising': return 'text-orange-600';
      case 'falling': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getGlucoseColor = (glucose: number) => {
    if (glucose < 3.9) return 'text-red-600'; // Low
    if (glucose > 10.0) return 'text-orange-600'; // High
    return 'text-green-600'; // Normal
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.7) return 'text-green-600';
    if (confidence > 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          🔮 2h Prediction
        </h3>
        <div className="flex items-center space-x-1">
          <span className={`text-xs ${getConfidenceColor(prediction.confidence)}`}>
            {Math.round(prediction.confidence * 100)}%
          </span>
          <span className="text-xs text-gray-400">confidence</span>
        </div>
      </div>

      {/* Main Prediction */}
      <div className="text-center mb-3">
        <div className={`text-2xl font-bold ${getGlucoseColor(prediction.predictedGlucose)}`}>
          {prediction.predictedGlucose} mmol/L
        </div>
        <div className={`text-sm flex items-center justify-center ${getTrendColor(prediction.trend)}`}>
          <span className="mr-1">{getTrendIcon(prediction.trend)}</span>
          <span className="capitalize">{prediction.trend}</span>
        </div>
      </div>

      {/* Factors Breakdown */}
      <div className="space-y-1">
        <div className="text-xs text-gray-600 font-medium mb-1">Contributing factors:</div>
        
        {/* Current Baseline */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">📊 Baseline:</span>
          <span className="font-medium text-gray-800">
            {prediction.factors.baseline} mmol/L
          </span>
        </div>

        {/* Carbs Impact */}
        {prediction.factors.carbs !== 0 && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-orange-600">🍞 Carbs:</span>
            <span className={`font-medium ${prediction.factors.carbs > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
              {prediction.factors.carbs > 0 ? '+' : ''}{prediction.factors.carbs} mmol/L
            </span>
          </div>
        )}

        {/* Insulin Impact */}
        {prediction.factors.insulin !== 0 && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-blue-600">💉 Insulin:</span>
            <span className={`font-medium ${prediction.factors.insulin < 0 ? 'text-blue-600' : 'text-gray-500'}`}>
              {prediction.factors.insulin} mmol/L
            </span>
          </div>
        )}

        {/* Net Change */}
        <div className="border-t border-gray-200 pt-1 mt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-700 font-medium">Net change:</span>
            <span className={`font-bold ${prediction.predictedGlucose > currentGlucose ? 'text-orange-600' : prediction.predictedGlucose < currentGlucose ? 'text-blue-600' : 'text-gray-600'}`}>
              {prediction.predictedGlucose > currentGlucose ? '+' : ''}{Math.round((prediction.predictedGlucose - currentGlucose) * 10) / 10} mmol/L
            </span>
          </div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Confidence:</span>
          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                prediction.confidence > 0.7 
                  ? 'bg-green-500' 
                  : prediction.confidence > 0.4 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
              }`}
              style={{ width: `${prediction.confidence * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Warning for low confidence */}
      {prediction.confidence < 0.5 && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          ⚠️ Low confidence prediction. Consider more recent glucose readings and notes.
        </div>
      )}
    </div>
  );
};

export default GlucosePrediction;
