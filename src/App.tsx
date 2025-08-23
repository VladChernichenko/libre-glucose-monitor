import React, { Suspense } from 'react';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading Glucose Monitor...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  // 🔓 TEMPORARILY DISABLED AUTHENTICATION
  // This bypasses the login form and always shows the Dashboard
  // To re-enable: uncomment the authentication logic below

  // TODO: Re-enable authentication when ready
  // const [isAuthenticated, setIsAuthenticated] = useState(false);
  // const [isLoading, setIsLoading] = useState(true);
  // 
  // useEffect(() => {
  //   const checkAuth = () => {
  //     const isAuth = libreApiService.isAuthenticated();
  //     setIsAuthenticated(isAuth);
  //     setIsLoading(false);
  //   };
  //   checkAuth();
  // }, []);
  // 
  // const handleLoginSuccess = () => {
  //   setIsAuthenticated(true);
  // };
  // 
  // if (isLoading) {
  //   return <LoadingFallback />;
  // }
  // 
  // return (
  //   <div className="App">
  //     {isAuthenticated ? <Dashboard /> : <LoginForm onLoginSuccess={handleLoginSuccess} />}
  //   </div>
  // );

  return (
    <ErrorBoundary>
      <div className="App">
        <Suspense fallback={<LoadingFallback />}>
          <Dashboard />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

export default App;
