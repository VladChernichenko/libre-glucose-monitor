import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import JwtLoginForm from './components/JwtLoginForm';
import { AppRoutes } from './app/routes';
import { GlucoseProvider } from './state/GlucoseStore';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-label-secondary">Loading…</p>
      </div>
    );
  }
  // The provider sits inside the authenticated branch so the login screen
  // never fires glucose requests. It is still inside BrowserRouter, which
  // useLocation requires.
  return isAuthenticated ? (
    <GlucoseProvider>
      <AppRoutes />
    </GlucoseProvider>
  ) : (
    <JwtLoginForm />
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
