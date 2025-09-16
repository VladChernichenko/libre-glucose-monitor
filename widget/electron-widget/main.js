const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 200,
    height: 80,
    x: width - 220, // Position near top-right corner
    y: 20,
    frame: false, // Remove window frame
    transparent: true, // Transparent background
    alwaysOnTop: true, // Always stay on top
    skipTaskbar: true, // Don't show in taskbar
    resizable: false, // Fixed size
    minimizable: false, // Can't minimize
    maximizable: false, // Can't maximize
    closable: true, // Can close
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    }
  });

  // Load the HTML file
  mainWindow.loadFile('widget.html');

  // Hide menu bar
  mainWindow.setMenuBarVisibility(false);

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Make window click-through for desktop integration (optional)
  // mainWindow.setIgnoreMouseEvents(true);
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Prevent app from quitting when all windows are closed (keep in background)
app.on('before-quit', (event) => {
  if (mainWindow) {
    event.preventDefault();
    mainWindow.hide();
  }
});
