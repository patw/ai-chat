// js/api-client.js

class APIClient {
    constructor(configManager) {
        this.configManager = configManager;
        this.setupStreamingListener();
    }
    
    setupStreamingListener() {
        // Set up the streaming chunk listener
        this.streamingCleanup = window.electronAPI.onStreamingChunk((chunk) => {
            if (this.onStreamingChunk) {
                this.onStreamingChunk(chunk);
            }
        });
    }
    
    setStreamingCallback(callback) {
        this.onStreamingChunk = callback;
    }
    
    async callStreamingAPI(message, conversationHistory) {
        const config = this.configManager.getConfig();
        
        if (!config.apiKey || !config.baseUrl) {
            throw new Error('API configuration is incomplete');
        }
        
        // Build messages array with optional system message
        let messages = [];
        
        // Add system message if configured
        if (config.systemMessage) {
            messages.push({ role: 'system', content: config.systemMessage });
        }
        
        // Add conversation history
        messages = messages.concat(conversationHistory);
        
        // Add current user message
        messages.push({ role: 'user', content: message });
        
        const isAnthropic = config.baseUrl.includes('anthropic');
        
        let apiUrl, headers, body;
        
        if (isAnthropic) {
            apiUrl = `${config.baseUrl.replace(/\/$/, '')}/v1/messages`;
            headers = {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01'
            };
            
            // For Anthropic, system message goes in a separate field
            body = {
                model: config.model,
                max_tokens: 4000,
                stream: true,
                messages: [...conversationHistory, { role: 'user', content: message }]
            };
            
            if (config.systemMessage) {
                body.system = config.systemMessage;
            }
        } else {
            // OpenAI-compatible API (including custom endpoints)
            apiUrl = `${config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            };
            body = {
                model: config.model,
                messages: messages,
                max_tokens: 4000,
                temperature: 0.7,
                stream: true
            };
        }
        
        const result = await window.electronAPI.makeStreamingRequest(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (!result.ok) {
            throw new Error(result.error || `HTTP ${result.status}`);
        }
        
        const responseText = result.fullResponse || '';
        
        if (!responseText) {
            throw new Error('Empty response from API');
        }
        
        return responseText;
    }
    
    cleanup() {
        if (this.streamingCleanup) {
            this.streamingCleanup();
        }
    }
}

// Create global instance - will be initialized in app.js
window.APIClient = APIClient;