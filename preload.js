// preload.js - Preload script for secure IPC communication
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration methods
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // API request methods
  makeApiRequest: (url, options) => ipcRenderer.invoke('make-api-request', { url, options }),
  
  // Streaming API request
  makeStreamingRequest: (url, options) => ipcRenderer.invoke('make-streaming-request', { url, options }),
  
  // Streaming event listener
  onStreamingChunk: (callback) => {
    const listener = (event, chunk) => callback(chunk);
    ipcRenderer.on('streaming-chunk', listener);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('streaming-chunk', listener);
    };
  },
  
  // Dialog methods
  showErrorDialog: (title, message) => ipcRenderer.invoke('show-error-dialog', title, message),
  
  // App info
  platform: process.platform
});