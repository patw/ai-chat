// js/app.js

class AIChat {
    constructor() {
        this.initializeApp();
    }
    
    async initializeApp() {
        // Initialize all components
        this.configManager = window.configManager;
        this.markdownRenderer = window.markdownRenderer;
        this.apiClient = new window.APIClient(this.configManager);
        this.chatUI = new window.ChatUI(this.configManager, this.apiClient, this.markdownRenderer);
        
        // Load initial configuration
        await this.configManager.loadConfiguration();
        
        // Update UI state
        this.chatUI.updateButtonState();
        
        // Make instances available globally for debugging and copy buttons
        window.aiChat = this;
    }
    
    // Method for copy buttons to access
    copyCode(button, code) {
        this.markdownRenderer.copyCode(button, code);
    }
    
    cleanup() {
        if (this.apiClient) {
            this.apiClient.cleanup();
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new AIChat();
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
        app.cleanup();
    });
});