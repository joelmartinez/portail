// HTML Sanitization Function
function sanitizeHTML(html) {
    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Remove all script tags
    const scripts = temp.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // Remove all event handlers and dangerous attributes
    const allElements = temp.querySelectorAll('*');
    allElements.forEach(el => {
        // Remove event handler attributes
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('on')) {
                el.removeAttribute(attr.name);
            }
        });
        
        // Remove dangerous attributes
        const dangerousAttrs = ['formaction', 'form', 'formmethod', 'formtarget'];
        dangerousAttrs.forEach(attr => {
            if (el.hasAttribute(attr)) {
                el.removeAttribute(attr);
            }
        });
        
        // Sanitize href attributes to prevent javascript:, data:, and vbscript: URLs
        if (el.hasAttribute('href')) {
            const href = el.getAttribute('href');
            const lowerHref = href ? href.trim().toLowerCase() : '';
            if (lowerHref.startsWith('javascript:') || 
                lowerHref.startsWith('data:') ||
                lowerHref.startsWith('vbscript:')) {
                el.setAttribute('href', '#');
            }
        }
        
        // Sanitize src attributes
        if (el.hasAttribute('src')) {
            const src = el.getAttribute('src');
            const lowerSrc = src ? src.trim().toLowerCase() : '';
            if (lowerSrc.startsWith('javascript:') || 
                lowerSrc.startsWith('data:') ||
                lowerSrc.startsWith('vbscript:')) {
                el.removeAttribute('src');
            }
        }
    });
    
    return temp.innerHTML;
}

// Configuration
const CONFIG = {
    OPENAI_MODEL: 'gpt-3.5-turbo',
    TEMPERATURE: 0.8,
    MAX_TOKENS: 1000,
    MAX_PROMPT_LENGTH: 500  // Limit for prompt injection protection and API efficiency
};

// Sanitize text for use in prompts to prevent injection
function sanitizePromptText(text) {
    if (!text || typeof text !== 'string') {
        return 'unknown';
    }
    // Limit length and remove potentially harmful characters
    return text
        .slice(0, CONFIG.MAX_PROMPT_LENGTH)
        .replace(/[<>{}]/g, '')
        .trim() || 'unknown';
}

// Escape HTML entities for safe display in HTML
function escapeHTML(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// App State
const state = {
    apiKey: null,
    currentScreen: 'warning',
    generatedContent: null,
    aiProvider: null,
    selectedModel: 'gpt-3.5-turbo'
};

// DOM Elements
const screens = {
    warning: document.getElementById('warning-screen'),
    apikey: document.getElementById('apikey-screen'),
    experience: document.getElementById('experience-screen')
};

const elements = {
    acknowledgeCheckbox: document.getElementById('acknowledge-checkbox'),
    proceedBtn: document.getElementById('proceed-btn'),
    apiKeyInput: document.getElementById('api-key-input'),
    toggleVisibilityBtn: document.getElementById('toggle-visibility'),
    modelSelect: document.getElementById('model-select'),
    customModelGroup: document.getElementById('custom-model-group'),
    customModelInput: document.getElementById('custom-model-input'),
    backBtn: document.getElementById('back-btn'),
    startBtn: document.getElementById('start-btn'),
    apiError: document.getElementById('api-error'),
    generatedContent: document.getElementById('generated-content'),
    regenerateBtn: document.getElementById('regenerate-btn'),
    resetBtn: document.getElementById('reset-btn')
};

// Screen Navigation
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
    state.currentScreen = screenName;
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Warning screen
    elements.acknowledgeCheckbox.addEventListener('change', (e) => {
        elements.proceedBtn.disabled = !e.target.checked;
    });

    elements.proceedBtn.addEventListener('click', () => {
        showScreen('apikey');
    });

    // API Key screen
    elements.toggleVisibilityBtn.addEventListener('click', () => {
        const input = elements.apiKeyInput;
        if (input.type === 'password') {
            input.type = 'text';
            elements.toggleVisibilityBtn.textContent = 'Hide';
        } else {
            input.type = 'password';
            elements.toggleVisibilityBtn.textContent = 'Show';
        }
    });

    // Model selection
    elements.modelSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            elements.customModelGroup.style.display = 'block';
        } else {
            elements.customModelGroup.style.display = 'none';
        }
    });

    elements.backBtn.addEventListener('click', () => {
        showScreen('warning');
    });

    elements.startBtn.addEventListener('click', async () => {
        const apiKey = elements.apiKeyInput.value.trim();
        
        if (!apiKey) {
            showError('Please enter your API key');
            return;
        }

        if (!apiKey.startsWith('sk-')) {
            showError('Invalid API key format. OpenAI API keys start with "sk-"');
            return;
        }

        // Get selected model
        let selectedModel = elements.modelSelect.value;
        if (selectedModel === 'custom') {
            selectedModel = elements.customModelInput.value.trim();
            if (!selectedModel) {
                showError('Please enter a custom model name');
                return;
            }
        }

        state.selectedModel = selectedModel;

        // Create AI provider instance
        state.aiProvider = createAIProvider('openai', apiKey, {
            model: selectedModel,
            temperature: CONFIG.TEMPERATURE,
            maxTokens: CONFIG.MAX_TOKENS
        });

        // Test the API key
        const isValid = await testApiKey();
        if (!isValid) {
            return; // Error already shown in testApiKey
        }

        state.apiKey = apiKey;
        showScreen('experience');
        generateExperience();
    });

    // Experience screen
    elements.regenerateBtn.addEventListener('click', () => {
        generateExperience();
    });

    elements.resetBtn.addEventListener('click', () => {
        if (confirm('This will clear your API key and reset the application. Continue?')) {
            state.apiKey = null;
            state.generatedContent = null;
            elements.apiKeyInput.value = '';
            elements.acknowledgeCheckbox.checked = false;
            elements.proceedBtn.disabled = true;
            showScreen('warning');
        }
    });
}

// Error Display
function showError(message) {
    elements.apiError.textContent = message;
    elements.apiError.style.display = 'block';
    setTimeout(() => {
        elements.apiError.style.display = 'none';
    }, 5000);
}

// Test API Key
async function testApiKey() {
    elements.startBtn.disabled = true;
    elements.startBtn.textContent = 'Validating...';

    try {
        await state.aiProvider.validate();
        return true;
    } catch (error) {
        showError(error.message);
        return false;
    } finally {
        elements.startBtn.disabled = false;
        elements.startBtn.textContent = 'Start Experience';
    }
}

// Generate Experience using OpenAI
async function generateExperience() {
    // Show loading state
    elements.generatedContent.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Generating your unique experience...</p>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 1rem;">
                This may take a few moments...
            </p>
        </div>
    `;

    elements.regenerateBtn.disabled = true;

    try {
        // Generate a random theme/prompt for variety
        const themes = [
            'a futuristic space station',
            'an enchanted forest',
            'a cyberpunk city',
            'an underwater civilization',
            'a steampunk laboratory',
            'a mystical mountain temple',
            'a post-apocalyptic wasteland',
            'a magical library',
            'a retro-futuristic diner',
            'an interdimensional portal hub'
        ];

        const contentTypes = [
            'interactive story',
            'exploration guide',
            'mysterious message',
            'creative adventure',
            'philosophical journey'
        ];

        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        const randomType = contentTypes[Math.floor(Math.random() * contentTypes.length)];

        const prompt = `Create a unique, engaging, and creative ${randomType} set in ${randomTheme}. 
        
        CRITICAL REQUIREMENTS:
        - Your response MUST be ONLY valid HTML content
        - The HTML will be inserted directly into a <div> element in a web page
        - Do NOT include <html>, <head>, or <body> tags
        - Do NOT include any explanatory text before or after the HTML
        - Start immediately with HTML tags (e.g., <h1>, <div>, <p>, etc.)
        
        Content Requirements:
        - Include a clear title using <h1> or <h2>
        - Add 3-5 paragraphs of engaging content
        - Include 3-5 clickable links (use href="#") that represent different sections or choices
        - Use semantic HTML tags: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <blockquote>, etc.
        - Add visual variety with lists, quotes, or emphasized text
        - Keep total content under 500 words
        - Make it immersive and unique
        
        Example format (DO NOT copy this, create something completely different):
        <h1>Your Title Here</h1>
        <p>Opening paragraph...</p>
        <ul>
          <li><a href="#">Link 1</a></li>
          <li><a href="#">Link 2</a></li>
        </ul>
        <p>More content...</p>`;

        const generatedHTML = await state.aiProvider.generateContent(prompt);

        // Sanitize the AI-generated HTML to prevent XSS attacks
        const sanitizedHTML = sanitizeHTML(generatedHTML);

        // Display the sanitized generated content
        elements.generatedContent.innerHTML = sanitizedHTML;

        // Add click handlers to generated links for SPA behavior
        const links = elements.generatedContent.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                handleLinkClick(link);
            });
        });

        state.generatedContent = generatedHTML;

    } catch (error) {
        const escapedMessage = escapeHTML(error.message || 'Unknown error');
        elements.generatedContent.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h2 style="color: var(--danger-color);">⚠️ Generation Failed</h2>
                <p>There was an error generating content: ${escapedMessage}</p>
                <p style="color: var(--text-muted); margin-top: 1rem;">
                    This could be due to API limits, network issues, or an invalid API key.
                    Please try again.
                </p>
            </div>
        `;
    } finally {
        elements.regenerateBtn.disabled = false;
    }
}

// Handle link clicks in generated content
async function handleLinkClick(link) {
    // Sanitize inputs to prevent prompt injection
    const linkText = sanitizePromptText(link.textContent);
    const linkContext = sanitizePromptText(link.getAttribute('href') || link.getAttribute('data-context') || '');

    // Show loading state (escape HTML for safe display)
    const escapedLinkText = escapeHTML(linkText);
    elements.generatedContent.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading: ${escapedLinkText}...</p>
        </div>
    `;

    elements.regenerateBtn.disabled = true;

    try {
        const prompt = `The user clicked on a link titled "${linkText}" in context "${linkContext}". 
        Generate new HTML content that represents what this link would lead to. 
        Make it feel like a natural continuation or new section of an interactive experience.
        
        CRITICAL REQUIREMENTS:
        - Your response MUST be ONLY valid HTML content
        - The HTML will be inserted directly into a <div> element in a web page
        - Do NOT include <html>, <head>, or <body> tags
        - Do NOT include any explanatory text before or after the HTML
        - Start immediately with HTML tags
        
        Content Requirements:
        - Include a clear title related to "${linkText}"
        - Add 3-5 paragraphs of engaging content
        - Include 3-5 new clickable links (use href="#") for further navigation
        - Use semantic HTML tags
        - Keep it under 500 words
        - Make it relevant to the clicked link`;

        const generatedHTML = await state.aiProvider.generateContent(prompt);

        // Sanitize the AI-generated HTML to prevent XSS attacks
        const sanitizedHTML = sanitizeHTML(generatedHTML);

        elements.generatedContent.innerHTML = sanitizedHTML;

        // Add click handlers to new links
        const links = elements.generatedContent.querySelectorAll('a');
        links.forEach(newLink => {
            newLink.addEventListener('click', (e) => {
                e.preventDefault();
                handleLinkClick(newLink);
            });
        });

    } catch (error) {
        const escapedMessage = escapeHTML(error.message || 'Unknown error');
        elements.generatedContent.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h2 style="color: var(--danger-color);">⚠️ Navigation Failed</h2>
                <p>There was an error loading this content: ${escapedMessage}</p>
                <button id="reload-page-btn" class="btn btn-primary" style="margin-top: 1rem;">
                    Reload Page
                </button>
            </div>
        `;
        // Add event listener for the reload button
        const reloadBtn = document.getElementById('reload-page-btn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => location.reload());
        }
    } finally {
        elements.regenerateBtn.disabled = false;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    showScreen('warning');
});
