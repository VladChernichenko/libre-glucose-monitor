import React, { useState } from 'react';
import NightscoutConfigModal from './NightscoutConfigModal';
import { useAuth } from '../contexts/AuthContext';

interface NightscoutFallbackUIProps {
  onRetry: () => void;
  onConfigure: () => void;
  error?: string;
  isRetrying?: boolean;
  needsConfiguration?: boolean;
}

const NightscoutFallbackUI: React.FC<NightscoutFallbackUIProps> = ({
  onRetry,
  onConfigure,
  error,
  isRetrying = false,
  needsConfiguration = false
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const { logout } = useAuth();

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-6 m-4">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {needsConfiguration ? 'Nightscout Configuration Required' : 'Nightscout Data Unavailable'}
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          {needsConfiguration 
            ? 'Please configure your Nightscout settings to start monitoring your glucose data.'
            : 'We\'re having trouble connecting to your Nightscout data. This could be due to:'
          }
        </p>
        
        <ul className="text-sm text-gray-600 text-left max-w-md mx-auto mb-6 space-y-1">
          <li>• Network connectivity issues</li>
          <li>• Nightscout site is temporarily down</li>
          <li>• Incorrect configuration settings</li>
          <li>• Authentication problems</li>
        </ul>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-600">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Retrying...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </>
            )}
          </button>

          <button
            onClick={() => setShowConfigModal(true)}
            className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configure Nightscout
          </button>

          <button
            onClick={onConfigure}
            className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Settings
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            💡 What you can do:
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Check your internet connection</li>
            <li>• Verify your Nightscout site is running</li>
            <li>• Review your Nightscout configuration</li>
            <li>• Try refreshing the page</li>
            <li>• Contact support if the issue persists</li>
          </ul>
        </div>
      </div>

      <NightscoutConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onLogout={logout}
        onSave={async (config) => {
          try {
            console.log('🔧 NightscoutFallbackUI: Saving configuration:', config);
            // Import the API service dynamically to avoid circular dependencies
            const { nightscoutConfigApi } = await import('../services/nightscoutConfigApi');
            await nightscoutConfigApi.saveConfig(config);
            console.log('🔧 NightscoutFallbackUI: Configuration saved successfully');
            setShowConfigModal(false);
            onRetry();
          } catch (error) {
            console.error('🔧 NightscoutFallbackUI: Failed to save configuration:', error);
            throw error; // Re-throw to let the modal handle the error
          }
        }}
      />
    </div>
  );
};

export default NightscoutFallbackUI;
