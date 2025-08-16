// js/markdown-renderer.js

class MarkdownRenderer {
    constructor() {
        this.initializeMarked();
    }
    
    initializeMarked() {
        marked.setOptions({
            highlight: function(code, lang) {
                if (Prism.languages[lang]) {
                    return Prism.highlight(code, Prism.languages[lang], lang);
                }
                return code;
            },
            breaks: true,
            gfm: true,
            tables: true,
            sanitize: false
        });
    }
    
    render(text) {
        // Parse markdown to HTML
        let html = marked.parse(text);
        
        // Wrap code blocks with a div that includes a copy button
        html = html.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (match, attrs, code) => {
            try {
                // First decode HTML entities
                const decodedCode = this.decodeHtml(code);
                // Extract language from class attribute if present
                const langMatch = attrs.match(/class="language-([^"]+)"/);
                const lang = langMatch ? langMatch[1] : null;
                
                // Escape special characters for the copy button
                const escapedCode = this.escapeForTemplateLiteral(decodedCode);
                
                // For Python specifically, ensure proper handling
                if (lang === 'python') {
                    const highlighted = Prism.highlight(
                        decodedCode,
                        Prism.languages.python,
                        'python'
                    );
                    return `<div class="code-block-wrapper">
                        <button class="copy-button" onclick="window.markdownRenderer.copyCode(this, \`${escapedCode}\`)">Copy</button>
                        <pre><code class="language-python">${highlighted}</code></pre>
                    </div>`;
                }
                
                // For other languages or no language specified
                if (lang && Prism.languages[lang]) {
                    return `<div class="code-block-wrapper">
                        <button class="copy-button" onclick="window.markdownRenderer.copyCode(this, \`${escapedCode}\`)">Copy</button>
                        <pre><code class="language-${lang}">${Prism.highlight(decodedCode, Prism.languages[lang], lang)}</code></pre>
                    </div>`;
                }
                
                // Fallback for unknown languages
                return `<div class="code-block-wrapper">
                    <button class="copy-button" onclick="window.markdownRenderer.copyCode(this, \`${escapedCode}\`)">Copy</button>
                    <pre><code>${decodedCode}</code></pre>
                </div>`;
            } catch (error) {
                // Suppress specific Prism.js error about tokenizePlaceholders
                if (!error.message.includes('tokenizePlaceholders')) {
                    console.error('Error processing code block:', error);
                }
                // Fallback - render without syntax highlighting
                const escapedCode = this.escapeForTemplateLiteral(this.decodeHtml(code));
                return `<div class="code-block-wrapper">
                    <button class="copy-button" onclick="window.markdownRenderer.copyCode(this, \`${escapedCode}\`)">Copy</button>
                    <pre><code>${this.decodeHtml(code)}</code></pre>
                </div>`;
            }
        });
        
        return html;
    }
    
    decodeHtml(html) {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    }
    
    escapeForTemplateLiteral(str) {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$/g, '\\$')
            .replace(/\n/g, '\\n');
    }
    
    copyCode(button, code) {
        navigator.clipboard.writeText(code).then(() => {
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.add('copied');
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
        });
    }
    
    highlightCodeBlocks(container) {
        try {
            // Only highlight if Prism is loaded and has languages
            if (window.Prism && Prism.languages) {
                Prism.highlightAllUnder(container);
            }
        } catch (error) {
            console.error('Error highlighting code:', error);
            // Fallback - just show the raw code
            const codeBlocks = container.querySelectorAll('pre code');
            codeBlocks.forEach(block => {
                block.innerHTML = block.textContent;
            });
        }
    }
}

// Create global instance
window.markdownRenderer = new MarkdownRenderer();