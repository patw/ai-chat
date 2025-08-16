// main.js - Electron main process
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;
const configPath = path.join(app.getPath('userData'), 'ai-chat-config.json');

// Default configuration
const defaultConfig = {
  apiKey: '',
  baseUrl: 'https://api.anthropic.com',
  model: 'claude-3-sonnet-20240229',
  systemMessage: '',
  theme: 'light'
};

console.log('Config path:', configPath);

// Ensure config directory exists on startup
async function ensureConfigDirectory() {
  const dir = path.dirname(configPath);
  try {
    await fs.mkdir(dir, { recursive: true });
    console.log('Config directory ensured:', dir);
  } catch (error) {
    console.error('Error creating config directory:', error);
  }
}

async function createWindow() {
  // Ensure config directory exists before creating window
  await ensureConfigDirectory();
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
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
    console.log('Loading config from:', configPath);
    const data = await fs.readFile(configPath, 'utf8');
    const loadedConfig = JSON.parse(data);
    const config = { ...defaultConfig, ...loadedConfig };
    console.log('Config loaded successfully, has API key:', !!config.apiKey);
    return config;
  } catch (error) {
    console.log('Config not found or invalid, using defaults:', error.message);
    // Try to save default config
    await saveConfig(defaultConfig);
    return defaultConfig;
  }
}

async function saveConfig(config) {
  try {
    console.log('Saving config to:', configPath);
    // Ensure the directory exists
    const dir = path.dirname(configPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write config with proper error handling
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    
    // Verify the file was written
    const verification = await fs.readFile(configPath, 'utf8');
    const verified = JSON.parse(verification);
    console.log('Config saved and verified successfully');
    
    return true;
  } catch (error) {
    console.error('Failed to save config:', error);
    return false;
  }
}

// IPC handlers
ipcMain.handle('get-config', async () => {
  const config = await loadConfig();
  console.log('Returning config to renderer, has API key:', !!config.apiKey);
  return config;
});

ipcMain.handle('save-config', async (event, config) => {
  console.log('Received config to save, has API key:', !!config.apiKey);
  const result = await saveConfig(config);
  console.log('Save result:', result);
  return result;
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
    console.error('API request error:', error);
    return {
      ok: false,
      error: error.message
    };
  }
});

ipcMain.handle('make-streaming-request', async (event, { url, options }) => {
  console.log('Making streaming request to:', url);
  try {
    const fetch = require('node-fetch');
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Streaming request failed:', response.status, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return {
          ok: false,
          status: response.status,
          error: errorJson.error?.message || errorJson.message || errorText
        };
      } catch {
        return {
          ok: false,
          status: response.status,
          error: errorText
        };
      }
    }
    
    let fullResponse = '';
    let buffer = '';
    
    // Process the stream
    return new Promise((resolve, reject) => {
      response.body.on('data', (chunk) => {
        const text = chunk.toString();
        buffer += text;
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === '' || !trimmed.startsWith('data: ')) continue;
          
          const data = trimmed.slice(6); // Remove 'data: '
          if (data === '[DONE]') {
            console.log('Stream completed, total response length:', fullResponse.length);
            resolve({
              ok: true,
              fullResponse: fullResponse
            });
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            let content = '';
            
            // Handle different API response formats
            if (parsed.choices && parsed.choices[0]) {
              // OpenAI format
              content = parsed.choices[0].delta?.content || '';
            } else if (parsed.delta && parsed.delta.text) {
              // Anthropic format
              content = parsed.delta.text;
            } else if (parsed.type === 'content_block_delta' && parsed.delta && parsed.delta.text) {
              // Anthropic streaming format
              content = parsed.delta.text;
            } else if (parsed.content) {
              // Alternative format
              content = parsed.content;
            }
            
            if (content) {
              fullResponse += content;
              // Send chunk to renderer
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('streaming-chunk', content);
              }
            }
          } catch (e) {
            console.error('Error parsing streaming chunk:', e.message, 'Data:', data);
          }
        }
      });
      
      response.body.on('end', () => {
        // Handle any remaining data in buffer
        if (buffer.trim()) {
          console.log('Processing remaining buffer:', buffer);
        }
        
        console.log('Stream ended, final response length:', fullResponse.length);
        resolve({
          ok: true,
          fullResponse: fullResponse || 'No response received'
        });
      });
      
      response.body.on('error', (error) => {
        console.error('Stream error:', error);
        reject({
          ok: false,
          error: error.message
        });
      });
    });
    
  } catch (error) {
    console.error('Streaming request error:', error);
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