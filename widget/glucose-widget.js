// Simple Glucose Monitor Widget for macOS
// Can be used with various widget frameworks or as a standalone web widget

class GlucoseWidget {
  constructor(config = {}) {
    this.config = {
      nightscoutUrl: '',
      updateInterval: 60000, // 1 minute
      width: 200,
      height: 80,
      ...config
    };
    
    this.container = null;
    this.updateTimer = null;
  }

  // Convert mg/dL to mmol/L
  convertToMmolL(mgdL) {
    return Math.round((mgdL / 18) * 10) / 10;
  }

  // Get trend arrow
  getTrendArrow(direction) {
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
  }

  // Calculate glucose status
  getGlucoseStatus(mmolL) {
    if (mmolL < 3.9) return 'low';
    if (mmolL < 10.0) return 'normal';
    if (mmolL < 13.9) return 'high';
    return 'critical';
  }

  // Get status colors
  getStatusColors(status) {
    const colors = {
      low: { bg: '#ff6b6b', text: '#fff' },
      normal: { bg: '#51cf66', text: '#fff' },
      high: { bg: '#ffd43b', text: '#333' },
      critical: { bg: '#e03131', text: '#fff' }
    };
    return colors[status] || colors.normal;
  }

  // Fetch glucose data
  async fetchGlucoseData() {
    try {
      const response = await fetch(`${this.config.nightscoutUrl}/api/v2/entries.json?count=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const entry = data[0];
        const mmolL = this.convertToMmolL(entry.sgv);
        const status = this.getGlucoseStatus(mmolL);
        const trendArrow = this.getTrendArrow(entry.direction);
        
        return {
          value: mmolL,
          trend: trendArrow,
          status: status,
          timestamp: new Date(entry.date),
          success: true
        };
      }
      
      throw new Error('No data available');
    } catch (error) {
      console.error('Failed to fetch glucose data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create widget HTML
  createWidget() {
    const widget = document.createElement('div');
    widget.id = 'glucose-widget';
    widget.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: ${this.config.width}px;
      height: ${this.config.height}px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 9999;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
    `;

    widget.innerHTML = '<div style="font-size: 14px;">Loading...</div>';
    
    // Add click handler to refresh
    widget.addEventListener('click', () => {
      this.updateDisplay();
    });

    return widget;
  }

  // Update widget display
  async updateDisplay() {
    if (!this.container) return;

    // Show loading state
    this.container.innerHTML = '<div style="font-size: 14px;">Loading...</div>';
    
    const glucoseData = await this.fetchGlucoseData();
    
    if (glucoseData.success) {
      const colors = this.getStatusColors(glucoseData.status);
      
      // Update background color
      this.container.style.background = `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%)`;
      this.container.style.color = colors.text;
      
      // Update content
      this.container.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 28px; font-weight: 700; margin-bottom: 2px; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);">
            ${glucoseData.value} mmol/L
          </div>
          <div style="font-size: 16px; opacity: 0.9; display: flex; align-items: center; justify-content: center; gap: 4px;">
            <span style="font-size: 18px;">${glucoseData.trend}</span>
            <span>Glucose</span>
          </div>
          <div style="font-size: 10px; opacity: 0.7; margin-top: 2px;">
            ${glucoseData.timestamp.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      `;
    } else {
      // Show error state
      this.container.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)';
      this.container.style.color = 'white';
      this.container.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 12px;">Connection Error</div>
          <div style="font-size: 10px; opacity: 0.8;">Click to retry</div>
        </div>
      `;
    }
  }

  // Initialize widget
  init(containerId = null) {
    // Remove existing widget if any
    const existing = document.getElementById('glucose-widget');
    if (existing) {
      existing.remove();
    }

    // Create widget
    this.container = this.createWidget();
    
    // Add to page
    if (containerId) {
      const container = document.getElementById(containerId);
      container.appendChild(this.container);
    } else {
      document.body.appendChild(this.container);
    }

    // Start updates
    this.updateDisplay();
    this.updateTimer = setInterval(() => {
      this.updateDisplay();
    }, this.config.updateInterval);

    console.log('Glucose Widget initialized and running');
  }

  // Destroy widget
  destroy() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}

// For browser usage
if (typeof window !== 'undefined') {
  window.GlucoseWidget = GlucoseWidget;
  
  // Auto-initialize if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const widget = new GlucoseWidget();
      widget.init();
    });
  } else {
    const widget = new GlucoseWidget();
    widget.init();
  }
}

// For Node.js/module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GlucoseWidget;
}
