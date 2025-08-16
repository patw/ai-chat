// js/config-manager.js

class ConfigManager {
    constructor() {
        this.config = {};
        this.elements = {};
        this.initializeElements();
        this.attachEventListeners();
    }
    
    initializeElements() {
        this.elements = {
            apiKey: document.getElementById('apiKey'),
            baseUrl: document.getElementById('baseUrl'),
            model: document.getElementById('model'),
            systemMessage: document.getElementById('systemMessage'),
            saveConfig: document.getElementById('saveConfig'),
            cancelConfig: document.getElementById('cancelConfig'),
            configBtn: document.getElementById('configBtn'),
            status: document.getElementById('status'),
            configModal: document.getElementById('configModal'),
            currentBaseUrl: document.getElementById('currentBaseUrl'),
            currentModel: document.getElementById('currentModel'),
            configStatus: document.getElementById('configStatus'),
            modelInfo: document.getElementById('modelInfo')
        };
    }
    
    attachEventListeners() {
        this.elements.configBtn.addEventListener('click', () => this.openModal());
        this.elements.saveConfig.addEventListener('click', () => this.saveConfiguration());
        this.elements.cancelConfig.addEventListener('click', () => this.closeModal());
        
        // Modal overlay click to close
        this.elements.configModal.addEventListener('click', (e) => {
            if (e.target === this.elements.configModal) {
                this.closeModal();
            }
        });
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.configModal.classList.contains('show')) {
                this.closeModal();
            }
        });
    }
    
    async loadConfiguration() {
        try {
            this.config = await window.electronAPI.getConfig();
            this.updateConfigUI();
            this.updateCurrentConfigDisplay();
            this.updateModelInfo();
            return this.config;
        } catch (error) {
            this.showStatus('Failed to load configuration', 'error');
            return {};
        }
    }
    
    updateCurrentConfigDisplay() {
        if (this.config.baseUrl) {
            this.elements.currentBaseUrl.textContent = this.config.baseUrl;
        } else {
            this.elements.currentBaseUrl.textContent = 'Not configured';
        }
        
        if (this.config.model) {
            this.elements.currentModel.textContent = this.config.model;
        } else {
            this.elements.currentModel.textContent = 'Not configured';
        }
        
        const isConfigured = this.config.apiKey && this.config.baseUrl && this.config.model;
        if (isConfigured) {
            this.elements.configStatus.textContent = '✅ Ready';
        } else {
            this.elements.configStatus.textContent = '❌ Not configured';
        }
    }
    
    openModal() {
        this.updateConfigUI();
        this.elements.configModal.classList.add('show');
        this.elements.apiKey.focus();
    }
    
    closeModal() {
        this.elements.configModal.classList.remove('show');
        this.hideStatus();
    }
    
    updateConfigUI() {
        this.elements.apiKey.value = this.config.apiKey || '';
        this.elements.baseUrl.value = this.config.baseUrl || '';
        this.elements.model.value = this.config.model || '';
        this.elements.systemMessage.value = this.config.systemMessage || '';
    }
    
    async saveConfiguration() {
        const newConfig = {
            apiKey: this.elements.apiKey.value.trim(),
            baseUrl: this.elements.baseUrl.value.trim(),
            model: this.elements.model.value.trim(),
            systemMessage: this.elements.systemMessage.value.trim(),
            theme: this.config.theme || 'light'
        };
        
        if (!newConfig.apiKey) {
            this.showStatus('API Key is required', 'error');
            return false;
        }
        
        if (!newConfig.baseUrl) {
            this.showStatus('Base URL is required', 'error');
            return false;
        }
        
        if (!newConfig.model) {
            this.showStatus('Model name is required', 'error');
            return false;
        }
        
        try {
            const saved = await window.electronAPI.saveConfig(newConfig);
            if (saved) {
                this.config = newConfig;
                this.showStatus('Configuration saved successfully!', 'success');
                this.updateCurrentConfigDisplay();
                this.updateModelInfo();
                
                // Close modal after a short delay
                setTimeout(() => {
                    this.closeModal();
                }, 1500);
                
                return true;
            } else {
                this.showStatus('Failed to save configuration', 'error');
                return false;
            }
        } catch (error) {
            this.showStatus('Failed to save configuration', 'error');
            return false;
        }
    }
    
    updateModelInfo() {
        if (this.config.model) {
            this.elements.modelInfo.textContent = `Model: ${this.config.model}`;
        } else {
            this.elements.modelInfo.textContent = 'Model: Not configured';
        }
    }
    
    showStatus(message, type) {
        this.elements.status.textContent = message;
        this.elements.status.className = `status ${type} show`;
        
        setTimeout(() => {
            this.hideStatus();
        }, 3000);
    }
    
    hideStatus() {
        this.elements.status.classList.remove('show');
        setTimeout(() => {
            this.elements.status.textContent = '';
            this.elements.status.className = 'status';
        }, 300);
    }
    
    isConfigured() {
        return !!(this.config.apiKey && this.config.baseUrl && this.config.model);
    }
    
    getConfig() {
        return this.config;
    }
}

// Create global instance
window.configManager = new ConfigManager();