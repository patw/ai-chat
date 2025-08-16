// js/chat-ui.js

class ChatUI {
    constructor(configManager, apiClient, markdownRenderer) {
        this.configManager = configManager;
        this.apiClient = apiClient;
        this.markdownRenderer = markdownRenderer;
        this.messages = [];
        this.isLoading = false;
        this.currentStreamingMessage = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.setupAPICallbacks();
    }
    
    initializeElements() {
        this.elements = {
            newChat: document.getElementById('newChat'),
            chatMessages: document.getElementById('chatMessages'),
            chatInput: document.getElementById('chatInput'),
            sendBtn: document.getElementById('sendBtn'),
            loading: document.getElementById('loading')
        };
    }
    
    attachEventListeners() {
        this.elements.newChat.addEventListener('click', () => this.newChat());
        
        // Chat input events
        this.elements.chatInput.addEventListener('input', () => this.handleInputChange());
        this.elements.chatInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Auto-resize textarea
        this.elements.chatInput.addEventListener('input', () => {
            this.elements.chatInput.style.height = 'auto';
            this.elements.chatInput.style.height = Math.min(this.elements.chatInput.scrollHeight, 120) + 'px';
        });
    }
    
    setupAPICallbacks() {
        this.apiClient.setStreamingCallback((chunk) => {
            this.appendToStreamingMessage(chunk);
        });
    }
    
    handleInputChange() {
        const hasText = this.elements.chatInput.value.trim().length > 0;
        const hasConfig = this.configManager.isConfigured();
        this.elements.sendBtn.disabled = !hasText || !hasConfig || this.isLoading;
    }
    
    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!this.elements.sendBtn.disabled) {
                this.sendMessage();
            }
        }
    }
    
    async sendMessage() {
        if (this.isLoading) return;
        
        const message = this.elements.chatInput.value.trim();
        if (!message) return;
        
        if (!this.configManager.isConfigured()) {
            this.configManager.showStatus('Please configure API settings first', 'error');
            return;
        }
        
        // Clear input and add user message
        this.elements.chatInput.value = '';
        this.elements.chatInput.style.height = 'auto';
        this.addMessage('user', message);
        
        // Show loading and create streaming message
        this.setLoading(true);
        const streamingMessageId = this.addStreamingMessage('assistant');
        
        try {
            const response = await this.apiClient.callStreamingAPI(message, this.messages);
            this.finalizeStreamingMessage(streamingMessageId, response);
            
            // Add messages to conversation history
            this.messages.push({ role: 'user', content: message });
            this.messages.push({ role: 'assistant', content: response });
        } catch (error) {
            this.finalizeStreamingMessage(streamingMessageId, `Error: ${error.message}`);
            this.configManager.showStatus('Failed to send message', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    addStreamingMessage(role) {
        // Remove empty state if it exists
        const emptyState = this.elements.chatMessages.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        const messageId = 'msg-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.id = messageId;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content streaming';
        contentDiv.textContent = '';
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString();
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);
        this.elements.chatMessages.appendChild(messageDiv);
        
        this.currentStreamingMessage = {
            id: messageId,
            contentDiv: contentDiv,
            content: ''
        };
        
        // Scroll to bottom
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        
        return messageId;
    }
    
    appendToStreamingMessage(chunk) {
        if (this.currentStreamingMessage) {
            this.currentStreamingMessage.content += chunk;
            // Render markdown for streaming content
            this.currentStreamingMessage.contentDiv.innerHTML = this.markdownRenderer.render(this.currentStreamingMessage.content);
            
            // Re-run syntax highlighting
            this.markdownRenderer.highlightCodeBlocks(this.currentStreamingMessage.contentDiv);
            
            // Scroll to bottom
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }
    }
    
    finalizeStreamingMessage(messageId, finalContent) {
        if (this.currentStreamingMessage && this.currentStreamingMessage.id === messageId) {
            const content = finalContent || this.currentStreamingMessage.content;
            this.currentStreamingMessage.contentDiv.innerHTML = this.markdownRenderer.render(content);
            this.currentStreamingMessage.contentDiv.classList.remove('streaming');
            
            // Re-run syntax highlighting
            this.markdownRenderer.highlightCodeBlocks(this.currentStreamingMessage.contentDiv);
            
            this.currentStreamingMessage = null;
        }
    }
    
    addMessage(role, content) {
        // Remove empty state if it exists
        const emptyState = this.elements.chatMessages.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (role === 'assistant') {
            // Render markdown for assistant messages
            contentDiv.innerHTML = this.markdownRenderer.render(content);
            // Run syntax highlighting
            this.markdownRenderer.highlightCodeBlocks(contentDiv);
        } else {
            // Keep user messages as plain text
            contentDiv.textContent = content;
        }
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString();
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);
        this.elements.chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        this.elements.loading.classList.toggle('show', loading);
        this.handleInputChange(); // Update button state
    }
    
    newChat() {
        this.messages = [];
        this.elements.chatMessages.innerHTML = `
            <div class="empty-state">
                <div>
                    <h3>👋 Ready for a new conversation!</h3>
                    <p>Start chatting with your AI assistant.</p>
                </div>
            </div>
        `;
        this.elements.chatInput.focus();
    }
    
    updateButtonState() {
        this.handleInputChange();
    }
}

// Create global class reference - will be initialized in app.js
window.ChatUI = ChatUI;