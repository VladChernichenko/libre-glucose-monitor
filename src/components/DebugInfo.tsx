import React from 'react';
import { getEnvironmentConfig } from '../config/environments';

const DebugInfo: React.FC = () => {
  const config = getEnvironmentConfig();
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="space-y-1">
        <div><strong>Environment:</strong> {config.environment}</div>
        <div><strong>Backend URL:</strong> {config.backendUrl}</div>
        <div><strong>COB API URL:</strong> {config.cobApiUrl}</div>
        <div><strong>Has Access Token:</strong> {accessToken ? 'Yes' : 'No'}</div>
        <div><strong>Has Refresh Token:</strong> {refreshToken ? 'Yes' : 'No'}</div>
        <div><strong>Token Preview:</strong> {accessToken ? accessToken.substring(0, 20) + '...' : 'None'}</div>
      </div>
    </div>
  );
};

export default DebugInfo;
