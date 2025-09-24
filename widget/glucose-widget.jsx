// Glucose Monitor Widget for Übersicht
// Place this file in your Übersicht widgets folder: ~/Library/Application Support/Übersicht/widgets/

// Configuration
const CONFIG = {
  NIGHTSCOUT_URL: '',
  UPDATE_INTERVAL: 60000, // 1 minute
  WIDGET_WIDTH: 200,
  WIDGET_HEIGHT: 80
};

// Widget refresh interval
export const refreshFrequency = CONFIG.UPDATE_INTERVAL;

// Widget command - fetch glucose data
export const command = `curl -s "${CONFIG.NIGHTSCOUT_URL}/api/v2/entries.json?count=1"`;

// Widget styling
export const className = `
  top: 20px;
  right: 20px;
  width: ${CONFIG.WIDGET_WIDTH}px;
  height: ${CONFIG.WIDGET_HEIGHT}px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: white;
  border-radius: 12px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
`;

// Convert mg/dL to mmol/L
const convertToMmolL = (mgdL) => {
  return Math.round((mgdL / 18) * 10) / 10;
};

// Get trend arrow
const getTrendArrow = (direction) => {
  const trendMap = {
    'DoubleUp': '↗↗',
    'SingleUp': '↗',
    'FortyFiveUp': '↗',
    'Flat': '→',
    'FortyFiveDown': '↘',
    'SingleDown': '↘',
    'DoubleDown': '↘↘',
    'NOT COMPUTABLE': '→',
    'RATE OUT OF RANGE': '→',
  };
  return trendMap[direction] || '→';
};

// Calculate glucose status
const getGlucoseStatus = (mmolL) => {
  if (mmolL < 3.9) return 'low';
  if (mmolL < 10.0) return 'normal';
  if (mmolL < 13.9) return 'high';
  return 'critical';
};

// Get background gradient based on status
const getStatusGradient = (status) => {
  const gradients = {
    low: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
    normal: 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)',
    high: 'linear-gradient(135deg, #ffd43b 0%, #fab005 100%)',
    critical: 'linear-gradient(135deg, #ff6b6b 0%, #e03131 100%)'
  };
  return gradients[status] || gradients.normal;
};

// Widget render function
export const render = ({ output, error }) => {
  if (error) {
    return (
      <div style={{ 
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '12px' }}>Connection Error</div>
        <div style={{ fontSize: '10px', opacity: 0.8 }}>Check Nightscout</div>
      </div>
    );
  }

  if (!output) {
    return (
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '14px' }}>Loading...</div>
      </div>
    );
  }

  try {
    const data = JSON.parse(output);
    
    if (!data || data.length === 0) {
      return (
        <div style={{ 
          background: 'linear-gradient(135deg, #ffd43b 0%, #fab005 100%)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px' }}>No Data</div>
          <div style={{ fontSize: '10px', opacity: 0.8 }}>Check Nightscout</div>
        </div>
      );
    }

    const entry = data[0];
    const mmolL = convertToMmolL(entry.sgv);
    const status = getGlucoseStatus(mmolL);
    const trendArrow = getTrendArrow(entry.direction);
    const timestamp = new Date(entry.date);

    return (
      <div style={{ 
        background: getStatusGradient(status),
        textAlign: 'center',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{ 
          fontSize: '28px', 
          fontWeight: '700',
          marginBottom: '2px',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        }}>
          {mmolL} mmol/L
        </div>
        <div style={{ 
          fontSize: '16px',
          opacity: 0.9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px'
        }}>
          <span style={{ fontSize: '18px' }}>{trendArrow}</span>
          <span>Glucose</span>
        </div>
        <div style={{ 
          fontSize: '10px',
          opacity: 0.7,
          marginTop: '2px'
        }}>
          {timestamp.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    );
  } catch (parseError) {
    return (
      <div style={{ 
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '12px' }}>Parse Error</div>
        <div style={{ fontSize: '10px', opacity: 0.8 }}>Invalid Data</div>
      </div>
    );
  }
};
