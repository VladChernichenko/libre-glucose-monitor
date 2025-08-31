import React from 'react';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  return (
    <div className="App">
      {/* Main Dashboard */}
      <Dashboard />
      
      {/* COB Test Component - Commented out for production */}
      {/* <div className="min-h-screen bg-gray-100 py-8">
        <CarbsOnBoardTest />
      </div> */}
    </div>
  );
};

export default App;
