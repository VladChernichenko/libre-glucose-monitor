import React, { useState, useEffect } from 'react';
import { versionService } from '../services/versionService';
import { getVersionInfo } from '../config/version';

interface VersionInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

const VersionInfo: React.FC<VersionInfoProps> = ({ isOpen, onClose }) => {
  const [backendVersion, setBackendVersion] = useState<any>(null);
  const [compatibility, setCompatibility] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const frontendVersion = getVersionInfo();
  
  useEffect(() => {
    if (isOpen) {
      fetchVersionInfo();
    }
  }, [isOpen]);
  
  const fetchVersionInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [backend, compat] = await Promise.all([
        versionService.getBackendVersion(),
        versionService.checkCompatibility()
      ]);
      
      setBackendVersion(backend);
      setCompatibility(compat);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch version info');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-auto flex flex-col max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            🔧 Version Information
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-600">Loading version information...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          {/* Frontend Version */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">🌐 Frontend</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">Version:</span> {frontendVersion.version}</div>
              <div><span className="font-medium">Environment:</span> {frontendVersion.environment}</div>
              <div><span className="font-medium">Build:</span> {frontendVersion.buildNumber}</div>
              <div><span className="font-medium">Commit:</span> {frontendVersion.gitCommit?.substring(0, 8) || 'unknown'}</div>
            </div>
          </div>
          
          {/* Backend Version */}
          {backendVersion && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">⚙️ Backend</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">Version:</span> {backendVersion.version}</div>
                <div><span className="font-medium">API Version:</span> {backendVersion.apiVersion}</div>
                <div><span className="font-medium">Environment:</span> {backendVersion.environment}</div>
                <div><span className="font-medium">Java:</span> {backendVersion.javaVersion}</div>
                <div><span className="font-medium">Spring Boot:</span> {backendVersion.springBootVersion}</div>
                <div><span className="font-medium">Build:</span> {backendVersion.buildNumber || 'unknown'}</div>
              </div>
            </div>
          )}
          
          {/* Compatibility Status */}
          {compatibility && (
            <div className={`border rounded-lg p-4 ${
              compatibility.compatible 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                compatibility.compatible ? 'text-green-900' : 'text-red-900'
              }`}>
                {compatibility.compatible ? '✅ Compatibility' : '❌ Compatibility Issues'}
              </h3>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Status:</span> {compatibility.recommendation}</div>
                <div><span className="font-medium">Compatible:</span> {compatibility.compatible ? 'Yes' : 'No'}</div>
                <div><span className="font-medium">Meets Minimum:</span> {compatibility.meetsMinimumVersion ? 'Yes' : 'No'}</div>
                {compatibility.deprecationWarning && (
                  <div className="text-orange-700 font-medium">⚠️ {compatibility.deprecationWarning}</div>
                )}
              </div>
            </div>
          )}
          
          {/* Feature Versions */}
          {backendVersion?.featureVersions && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">🔧 Feature Versions</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(backendVersion.featureVersions).map(([feature, version]) => (
                  <div key={feature}>
                    <span className="font-medium">{feature}:</span> {String(version)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionInfo;
