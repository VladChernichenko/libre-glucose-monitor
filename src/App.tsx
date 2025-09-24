import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import EnhancedDashboard from './components/EnhancedDashboard';
import JwtLoginForm from './components/JwtLoginForm';
import { versionService } from './services/versionService';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Version compatibility check only when authenticated and Nightscout credentials are configured
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const checkVersions = async () => {
      try {
        // Check if Nightscout credentials are configured before running version checks
        const { nightscoutConfigApi } = await import('./services/nightscoutConfigApi');
        const config = await nightscoutConfigApi.getConfig();
        
        if (!config) {
          console.log('🔍 Skipping version checks - no Nightscout credentials configured');
          return;
        }
        
        await versionService.logVersionInfo();
        const validation = await versionService.validateCompatibility();
        
        if (!validation.isCompatible) {
          console.error('❌ Version compatibility issues:', validation.errors);
          validation.errors.forEach(error => console.error('🔴', error));
        }
        
        if (validation.warnings.length > 0) {
          console.warn('⚠️ Version warnings:', validation.warnings);
          validation.warnings.forEach(warning => console.warn('🟡', warning));
        }
        
        if (validation.isCompatible) {
          console.log('✅ Frontend and backend versions are compatible');
        }
      } catch (error) {
        console.warn('⚠️ Could not verify version compatibility:', error);
      }
    };
    
    checkVersions();
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? <EnhancedDashboard /> : <JwtLoginForm />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
