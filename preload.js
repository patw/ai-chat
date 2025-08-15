// preload.js - Preload script for secure IPC communication
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration methods
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // API request method
  makeApiRequest: (url, options) => ipcRenderer.invoke('make-api-request', { url, options }),
  
  // Dialog methods
  showErrorDialog: (title, message) => ipcRenderer.invoke('show-error-dialog', title, message),
  
  // App info
  platform: process.platform
});