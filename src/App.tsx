import React from 'react';
import Dashboard from './components/Dashboard';
import CarbsOnBoardTest from './components/CarbsOnBoardTest';

const App: React.FC = () => {
  return (
    <div className="App">
      {/* Temporary: COB Test Component */}
      <div className="min-h-screen bg-gray-100 py-8">
        <CarbsOnBoardTest />
      </div>
      
      {/* Original Dashboard - Commented out for testing */}
      {/* <Dashboard /> */}
    </div>
  );
};

export default App;
