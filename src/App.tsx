import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import EnhancedDashboard from './components/EnhancedDashboard';
import JwtLoginForm from './components/JwtLoginForm';
import LibreLinkUpTest from './components/LibreLinkUpTest';
import { versionService } from './services/versionService';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'libre-test'>('dashboard');
  
  // Version compatibility check when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const checkVersions = async () => {
      try {
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
      {isAuthenticated ? (
        <>
          {currentView === 'dashboard' ? (
            <EnhancedDashboard />
          ) : (
            <div className="min-h-screen bg-gray-50">
              <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between items-center py-4">
                    <h1 className="text-xl font-semibold text-gray-900">LibreLinkUp Integration Test</h1>
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              </div>
              <LibreLinkUpTest />
            </div>
          )}
          
          {/* Navigation for LibreLinkUp test */}
          {currentView === 'dashboard' && (
            <div className="fixed bottom-4 right-4">
              <button
                onClick={() => setCurrentView('libre-test')}
                className="px-4 py-2 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-colors"
                title="Test LibreLinkUp Integration"
              >
                🩸 Test Libre
              </button>
            </div>
          )}
        </>
      ) : (
        <JwtLoginForm />
      )}
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
