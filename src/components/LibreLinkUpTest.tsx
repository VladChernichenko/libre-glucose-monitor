import React, { useState } from 'react';
import { libreApiService } from '../services/libreApi';

interface TestResult {
  type: 'success' | 'error' | 'info';
  message: string;
  data?: any;
}

const LibreLinkUpTest: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (type: TestResult['type'], message: string, data?: any) => {
    setResults(prev => [...prev, { type, message, data }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testAuthentication = async () => {
    if (!email || !password) {
      addResult('error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    addResult('info', 'Testing LibreLinkUp authentication...');

    try {
      const authResult = await libreApiService.authenticate(email, password);
      addResult('success', '✅ Authentication successful!', {
        token: authResult.token.substring(0, 20) + '...',
        expires: new Date(authResult.expires).toLocaleString()
      });

      // Test connections
      addResult('info', 'Testing connections...');
      const connections = await libreApiService.getConnections();
      addResult('success', `✅ Found ${connections.length} connection(s)`, connections);

      if (connections.length > 0) {
        // Test glucose data
        const patientId = connections[0].patientId;
        addResult('info', `Testing glucose data for patient ${patientId}...`);
        
        try {
          const glucoseData = await libreApiService.getGlucoseData(patientId, 1);
          addResult('success', `✅ Glucose data fetched: ${glucoseData.data.length} points`, {
            dataPoints: glucoseData.data.length,
            dateRange: `${new Date(glucoseData.startDate).toLocaleString()} - ${new Date(glucoseData.endDate).toLocaleString()}`,
            unit: glucoseData.unit
          });

          // Test current glucose
          addResult('info', 'Testing current glucose...');
          const currentGlucose = await libreApiService.getRealTimeData(patientId);
          addResult('success', '✅ Current glucose fetched', {
            value: currentGlucose.value,
            unit: currentGlucose.unit,
            trend: currentGlucose.trendArrow,
            timestamp: currentGlucose.timestamp.toLocaleString(),
            status: currentGlucose.status
          });

        } catch (glucoseError) {
          addResult('error', '❌ Glucose data fetch failed', glucoseError);
        }
      }

    } catch (error: any) {
      addResult('error', '❌ Authentication failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const testFallbackIntegration = async () => {
    if (!email || !password) {
      addResult('error', 'Please enter email and password first');
      return;
    }

    setIsLoading(true);
    addResult('info', 'Testing LibreLinkUp fallback integration...');

    try {
      // Save LibreLinkUp credentials for testing
      localStorage.setItem('libre_config', JSON.stringify({
        email: email,
        password: password
      }));

      // Import the enhanced nightscout service
      const { default: EnhancedNightscoutService } = await import('../services/nightscout/enhancedNightscoutService');
      const nightscoutService = new EnhancedNightscoutService({
        enableFallbacks: true,
        enableDemoData: false
      });

      // Test fallback data fetch
      addResult('info', 'Testing fallback glucose entries...');
      const entriesResult = await nightscoutService.getGlucoseEntries(10);
      
      if (entriesResult.success) {
        addResult('success', `✅ Fallback entries fetched: ${entriesResult.data?.length || 0} entries`, {
          source: entriesResult.source,
          fallbackUsed: entriesResult.fallbackUsed,
          sampleEntry: entriesResult.data?.[0]
        });
      } else {
        addResult('error', '❌ Fallback entries failed', entriesResult.error);
      }

      // Test fallback current glucose
      addResult('info', 'Testing fallback current glucose...');
      const currentResult = await nightscoutService.getCurrentGlucose();
      
      if (currentResult.success) {
        addResult('success', '✅ Fallback current glucose fetched', {
          source: currentResult.source,
          fallbackUsed: currentResult.fallbackUsed,
          value: currentResult.data?.sgv,
          unit: 'mg/dL',
          timestamp: currentResult.data?.dateString
        });
      } else {
        addResult('error', '❌ Fallback current glucose failed', currentResult.error);
      }

    } catch (error: any) {
      addResult('error', '❌ Fallback integration test failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-blue-800">🩸 LibreLinkUp Integration Test</h2>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">LibreLinkUp Credentials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your_email@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="your_password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={testAuthentication}
          disabled={isLoading}
          className="mr-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Testing...' : 'Test LibreLinkUp API'}
        </button>
        
        <button
          onClick={testFallbackIntegration}
          disabled={isLoading}
          className="mr-4 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Testing...' : 'Test Fallback Integration'}
        </button>
        
        <button
          onClick={clearResults}
          className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Clear Results
        </button>
      </div>

      <div className="space-y-3">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${
              result.type === 'success' ? 'bg-green-50 border border-green-200' :
              result.type === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}
          >
            <div className="font-medium mb-2">{result.message}</div>
            {result.data && (
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold mb-2">📝 Test Instructions</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Enter your LibreLinkUp email and password above</li>
          <li>Click "Test LibreLinkUp API" to verify direct API access</li>
          <li>Click "Test Fallback Integration" to test the fallback mechanism</li>
          <li>Check the results to see if LibreLinkUp integration is working</li>
        </ol>
        
        <div className="mt-3 p-3 bg-white rounded border">
          <h4 className="font-medium mb-1">🔧 Configuration for Production:</h4>
          <p className="text-sm text-gray-600">
            Add these to your <code>.env</code> file:
          </p>
          <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
REACT_APP_LIBRE_EMAIL=your_email@example.com{'\n'}REACT_APP_LIBRE_PASSWORD=your_password
          </pre>
        </div>
      </div>
    </div>
  );
};

export default LibreLinkUpTest;
