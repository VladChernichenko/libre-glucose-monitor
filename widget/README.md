# 🩸 Glucose Monitor Widget for macOS

A simple, elegant widget that displays your current glucose level and trend on your Mac desktop.

## 📱 **Widget Preview**
```
┌─────────────────────┐
│     5.8 mmol/L      │
│        ↗ Glucose    │
│       2:45 PM       │
└─────────────────────┘
```

## 🚀 **Installation Options**

### **Option 1: Übersicht Widget (Recommended)**

1. **Install Übersicht**: Download from [übersicht.app](http://tracesof.net/uebersicht/)
2. **Copy widget file**: 
   ```bash
   cp glucose-widget.jsx ~/Library/Application\ Support/Übersicht/widgets/
   ```
3. **Refresh Übersicht**: The widget will appear automatically

### **Option 2: Standalone HTML Widget**

1. **Open the HTML file**: Double-click `glucose-widget.html`
2. **Pin to desktop**: Use browser's "Add to Dock" or similar feature
3. **Auto-refresh**: Widget updates every minute automatically

### **Option 3: Custom Integration**

Use `glucose-widget.js` to integrate into your own macOS widget framework or web application.

## ⚙️ **Configuration**

Edit the configuration in any of the widget files:

```javascript
const CONFIG = {
  NIGHTSCOUT_URL: 'https://your-nightscout-url.com',  // Your Nightscout URL
  UPDATE_INTERVAL: 60000,  // Update every 60 seconds
  WIDGET_WIDTH: 200,       // Widget width in pixels
  WIDGET_HEIGHT: 80        // Widget height in pixels
};
```

## 🎨 **Features**

### **Visual Indicators**
- **Color-coded backgrounds**:
  - 🔴 **Red**: Low glucose (< 3.9 mmol/L)
  - 🟢 **Green**: Normal glucose (3.9-10.0 mmol/L)
  - 🟡 **Yellow**: High glucose (10.0-13.9 mmol/L)
  - 🔴 **Dark Red**: Critical glucose (> 13.9 mmol/L)

### **Trend Arrows**
- **↗↗**: Double Up (rapid rise)
- **↗**: Single Up (rising)
- **→**: Flat (stable)
- **↘**: Single Down (falling)
- **↘↘**: Double Down (rapid fall)

### **Real-time Updates**
- **Automatic refresh** every minute
- **Click to refresh** manually
- **Error handling** with visual feedback
- **Timestamp** showing last update time

## 🔧 **Customization**

### **Position (Übersicht)**
Edit the `className` in `glucose-widget.jsx`:
```javascript
export const className = `
  top: 20px;     // Distance from top
  right: 20px;   // Distance from right
  // ... other styles
`;
```

### **Colors**
Modify the `getStatusColors` function to customize colors:
```javascript
const colors = {
  low: { bg: '#your-color', text: '#fff' },
  normal: { bg: '#your-color', text: '#fff' },
  // ... etc
};
```

### **Size**
Adjust `WIDGET_WIDTH` and `WIDGET_HEIGHT` in the configuration.

## 🩺 **Data Source**

The widget fetches data from your Nightscout instance using the public API:
- **Endpoint**: `/api/v2/entries.json?count=1`
- **No authentication required** for read-only access
- **CORS-friendly** for browser usage

## 🛠️ **Troubleshooting**

### **Widget shows "Connection Error"**
- Check your Nightscout URL in the configuration
- Ensure Nightscout is accessible from your network
- Verify Nightscout API is working: `curl https://your-url.com/api/v2/entries.json?count=1`

### **Widget shows "No Data"**
- Check if your CGM is uploading data to Nightscout
- Verify recent glucose readings exist in Nightscout
- Check Nightscout web interface for data

### **Widget doesn't appear (Übersicht)**
- Ensure Übersicht is running
- Check widget file is in the correct folder
- Refresh Übersicht widgets (⌘+R)

## 📋 **Requirements**

- **macOS** 10.12 or later
- **Nightscout instance** with public API access
- **Internet connection** for data fetching

## 🔒 **Privacy**

- **No data storage**: Widget only displays current data
- **No authentication**: Uses public Nightscout API
- **Local processing**: All calculations done on your Mac
- **No external services**: Direct connection to your Nightscout

## 🎯 **Usage Tips**

1. **Position carefully**: Place where it won't interfere with work
2. **Monitor trends**: Pay attention to arrow directions
3. **Click to refresh**: Manual refresh when needed
4. **Color awareness**: Learn the color meanings for quick status checks

The widget provides a simple, at-a-glance view of your glucose status without opening the full application! 🎉
