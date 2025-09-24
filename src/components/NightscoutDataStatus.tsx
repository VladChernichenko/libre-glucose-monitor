import React, { useState, useEffect } from 'react';
import { EnhancedNightscoutService, NightscoutServiceResponse } from '../services/nightscout/enhancedNightscoutService';

interface NightscoutDataStatusProps {
  service: EnhancedNightscoutService;
  onStatusChange?: (status: DataStatus) => void;
  hasCredentials?: boolean;
}

interface DataStatus {
  source: 'nightscout' | 'stored' | 'demo' | 'error';
  healthy: boolean;
  lastUpdate?: Date;
  errorCount: number;
  fallbackUsed: boolean;
}

const NightscoutDataStatus: React.FC<NightscoutDataStatusProps> = ({ 
  service, 
  onStatusChange,
  hasCredentials = false
}) => {
  const [status, setStatus] = useState<DataStatus>({
    source: 'error',
    healthy: false,
    errorCount: 0,
    fallbackUsed: false
  });
  const [isChecking, setIsChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const checkStatus = async () => {
    if (!hasCredentials) {
      console.log('🔍 Skipping status check - no Nightscout credentials configured');
      return;
    }
    
    setIsChecking(true);
    try {
      // Test current glucose fetch
      const currentResponse = await service.getCurrentGlucose();
      
      // Test health check
      const healthResponse = await service.healthCheck();
      
      const newStatus: DataStatus = {
        source: currentResponse.source,
        healthy: currentResponse.success && healthResponse.healthy,
        lastUpdate: new Date(),
        errorCount: currentResponse.success ? 0 : status.errorCount + 1,
        fallbackUsed: currentResponse.fallbackUsed || false
      };

      setStatus(newStatus);
      onStatusChange?.(newStatus);
    } catch (error) {
      console.error('Status check failed:', error);
      setStatus(prev => ({
        ...prev,
        healthy: false,
        errorCount: prev.errorCount + 1,
        lastUpdate: new Date()
      }));
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (hasCredentials) {
      checkStatus();
      // Check status every 30 seconds
      const interval = setInterval(checkStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [hasCredentials]);

  const getStatusIcon = () => {
    if (isChecking) {
      return (
        <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }

    if (status.healthy) {
      if (status.fallbackUsed) {
        return (
          <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      }
      return (
        <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }

    return (
      <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking...';
    
    if (status.healthy) {
      if (status.fallbackUsed) {
        return 'Using Fallback Data';
      }
      return 'Connected to Nightscout';
    }
    
    return 'Connection Issues';
  };

  const getStatusColor = () => {
    if (isChecking) return 'text-blue-600';
    if (status.healthy) {
      return status.fallbackUsed ? 'text-yellow-600' : 'text-green-600';
    }
    return 'text-red-600';
  };

  const getSourceDescription = () => {
    switch (status.source) {
      case 'nightscout':
        return 'Live data from your Nightscout site';
      case 'stored':
        return 'Cached data from previous successful fetches';
      case 'demo':
        return 'Demo data for testing purposes';
      case 'error':
        return 'No data available';
      default:
        return 'Unknown source';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={checkStatus}
            disabled={isChecking}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Refresh'}
          </button>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Data Source:</span>
              <span className="font-medium">{getSourceDescription()}</span>
            </div>
            
            {status.lastUpdate && (
              <div className="flex justify-between">
                <span>Last Update:</span>
                <span className="font-medium">
                  {status.lastUpdate.toLocaleTimeString()}
                </span>
              </div>
            )}
            
            {status.errorCount > 0 && (
              <div className="flex justify-between">
                <span>Error Count:</span>
                <span className="font-medium text-red-600">
                  {status.errorCount}
                </span>
              </div>
            )}
            
            {status.fallbackUsed && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                <p className="text-yellow-800">
                  ⚠️ Using fallback data. Check your Nightscout configuration or network connection.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NightscoutDataStatus;

