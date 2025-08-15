// main.js - Electron main process
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;
const configPath = path.join(app.getPath('userData'), 'config.json');

// Default configuration
const defaultConfig = {
  apiKey: '',
  baseUrl: 'https://api.anthropic.com',
  model: 'claude-3-sonnet-20240229',
  theme: 'light'
};

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false
  });

  await mainWindow.loadFile('index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  
  // Also show immediately as fallback
  mainWindow.show();

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

// Configuration management
async function loadConfig() {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return { ...defaultConfig, ...JSON.parse(data) };
  } catch (error) {
    return defaultConfig;
  }
}

async function saveConfig(config) {
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save config:', error);
    return false;
  }
}

// IPC handlers
ipcMain.handle('get-config', async () => {
  return await loadConfig();
});

ipcMain.handle('save-config', async (event, config) => {
  return await saveConfig(config);
});

ipcMain.handle('make-api-request', async (event, { url, options }) => {
  try {
    const fetch = require('node-fetch');
    const response = await fetch(url, options);
    
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: 'Invalid response format', responseText: text };
      }
    }
    
    return {
      ok: response.ok,
      status: response.status,
      data: data
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
});

ipcMain.handle('show-error-dialog', async (event, title, message) => {
  dialog.showErrorBox(title, message);
});

// Handle app updates and other main process tasks here