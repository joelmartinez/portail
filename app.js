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
        
        // Sanitize href attributes to prevent javascript: URLs
        if (el.hasAttribute('href')) {
            const href = el.getAttribute('href');
            if (href && (href.trim().toLowerCase().startsWith('javascript:') || 
                        href.trim().toLowerCase().startsWith('data:'))) {
                el.setAttribute('href', '#');
            }
        }
        
        // Sanitize src attributes
        if (el.hasAttribute('src')) {
            const src = el.getAttribute('src');
            if (src && (src.trim().toLowerCase().startsWith('javascript:') || 
                       src.trim().toLowerCase().startsWith('data:'))) {
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
    MAX_PROMPT_LENGTH: 500
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

// App State
const state = {
    apiKey: null,
    currentScreen: 'warning',
    generatedContent: null
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

        // Test the API key
        const isValid = await testApiKey(apiKey);
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
async function testApiKey(apiKey) {
    elements.startBtn.disabled = true;
    elements.startBtn.textContent = 'Validating...';

    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                showError('Invalid API key. Please check your key and try again.');
            } else if (response.status === 429) {
                showError('Rate limit exceeded. Please try again in a moment.');
            } else {
                showError(`API error: ${response.status}. Please try again.`);
            }
            return false;
        }

        return true;
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
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
        
        Requirements:
        - Generate complete HTML content with headings, paragraphs, and interactive elements
        - Include 3-5 clickable links that would lead to different parts of this experience (use # as href)
        - Add some styled elements like quotes or lists
        - Make it visually interesting and immersive
        - Include a title, description, and interactive elements
        - Keep it under 500 words
        - Use modern, engaging language
        - Make every generation completely unique and different
        
        Format the response as clean HTML that can be directly inserted into a div. Use semantic HTML tags.
        Do NOT include <html>, <head>, or <body> tags - only the content that goes inside a div.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiKey}`
            },
            body: JSON.stringify({
                model: CONFIG.OPENAI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a creative HTML content generator. Generate engaging, unique HTML content for an experimental web experience. Always create something completely different and unexpected.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: CONFIG.TEMPERATURE,
                max_tokens: CONFIG.MAX_TOKENS
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const generatedHTML = data.choices[0].message.content;

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
        elements.generatedContent.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h2 style="color: var(--danger-color);">⚠️ Generation Failed</h2>
                <p>There was an error generating content: ${error.message}</p>
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

    // Show loading state (using sanitized linkText for display)
    elements.generatedContent.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading: ${linkText}...</p>
        </div>
    `;

    elements.regenerateBtn.disabled = true;

    try {
        const prompt = `The user clicked on a link titled "${linkText}" in context "${linkContext}". 
        Generate new HTML content that represents what this link would lead to. 
        Make it feel like a natural continuation or new section of an interactive experience.
        
        Requirements:
        - Generate complete HTML content
        - Include 3-5 new clickable links (use # as href)
        - Make it engaging and relevant to the link they clicked
        - Keep it under 500 words
        - Include a way to "go back" or explore other areas
        
        Format as clean HTML for insertion into a div. Do NOT include <html>, <head>, or <body> tags.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiKey}`
            },
            body: JSON.stringify({
                model: CONFIG.OPENAI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a creative HTML content generator for an interactive web experience.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: CONFIG.TEMPERATURE,
                max_tokens: CONFIG.MAX_TOKENS
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const generatedHTML = data.choices[0].message.content;

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
        elements.generatedContent.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h2 style="color: var(--danger-color);">⚠️ Navigation Failed</h2>
                <p>There was an error loading this content: ${error.message}</p>
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
