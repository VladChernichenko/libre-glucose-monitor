import React from 'react';
import Dashboard from './components/Dashboard';

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
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
  //         <p className="text-gray-600">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }
  // 
  // return (
  //   <div className="App">
  //     {isAuthenticated ? <Dashboard /> : <LoginForm onLoginSuccess={handleLoginSuccess} />}
  //   </div>
  // );

  return (
    <div className="App">
      <Dashboard />
    </div>
  );
};

export default App;
