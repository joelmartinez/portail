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
        // Remove event handler attributes except onclick on buttons (allow for simple interactions)
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('on')) {
                // Allow onclick on buttons only if it matches a very specific safe pattern
                if (attr.name === 'onclick' && el.tagName.toLowerCase() === 'button') {
                    const onclickValue = attr.value;
                    
                    // Normalize to prevent encoding-based bypasses
                    // This handles Unicode escapes like \u0065val and other encoding tricks
                    let normalizedValue = onclickValue;
                    try {
                        // Try to decode any Unicode/hex escapes
                        normalizedValue = onclickValue.replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
                            return String.fromCharCode(parseInt(match.substring(2), 16));
                        });
                        normalizedValue = normalizedValue.replace(/\\x[\dA-Fa-f]{2}/g, (match) => {
                            return String.fromCharCode(parseInt(match.substring(2), 16));
                        });
                    } catch (e) {
                        // If decoding fails, use original value
                    }
                    
                    // Check for dangerous keywords and patterns (using normalized value)
                    // Block semicolons to prevent statement chaining
                    const hasDangerousKeywords = /(\beval\b|\bFunction\b|javascript:|<script[\s>]|\.constructor|\bprototype\b|__proto__|location\.|document\.|window\.|globalThis\.|cookie|import\s|require\(|\bthis\b|;)/i.test(normalizedValue);
                    
                    // Must start with alert( and end with ) - nothing else allowed  
                    const isValidAlertCall = /^alert\s*\(.+\)\s*$/.test(normalizedValue.trim());
                    
                    // If Math is used, ensure it's only calling safe methods (no property access to constructor etc.)
                    const usesMath = /\bMath\b/i.test(normalizedValue);
                    let usesSafeMathOnly = true;
                    if (usesMath) {
                        // Math is used - ensure only safe Math methods are called
                        const safeMathPattern = /^Math\.(floor|ceil|round|random|abs|min|max|pow|sqrt|sign)$/i;
                        const mathUsages = normalizedValue.match(/Math\.\w+/gi) || [];
                        usesSafeMathOnly = mathUsages.every(usage => safeMathPattern.test(usage));
                    }
                    
                    if (!isValidAlertCall || hasDangerousKeywords || !usesSafeMathOnly) {
                        el.removeAttribute(attr.name);
                    }
                } else {
                    el.removeAttribute(attr.name);
                }
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
    MAX_TOKENS: 2000,  // Increased to support more diverse and complex experiences
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
    selectedModel: 'gpt-4o-mini'
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
        const prompt = `Generate a completely unique and unexpected experience. 

        You have COMPLETE creative control. Choose any format, genre, or modality you want. This could be:
        - A game (text adventure, RPG, puzzle, point-and-click, dungeon crawler, etc.)
        - A story (choose-your-own-adventure, interactive fiction, mystery, etc.)
        - An interface (retro computer terminal, dystopian bureaucracy, hacker webpage, etc.)
        - A world to explore (museum, building, dimension, timeline, etc.)
        - A creative format (blog, email inbox, chat conversation, social media, etc.)
        - Something completely different and unexpected

        CRITICAL TECHNICAL REQUIREMENTS:
        - Your response MUST be ONLY valid HTML content
        - Do NOT include <html>, <head>, or <body> tags
        - Do NOT include any explanatory text before or after the HTML
        - Start immediately with HTML tags

        INTERACTION MODEL:
        - You decide how users navigate (links, buttons, forms, clickable areas, etc.)
        - You decide how many interactive elements are needed (no fixed number required)
        - Match the interaction model to the experience type
        - Make interactions meaningful and contextual

        Make this experience memorable, immersive, and completely different from what might be expected. Be bold. Be creative. Surprise and delight.`;

        const generatedHTML = await state.aiProvider.generateContent(prompt);

        // Sanitize the AI-generated HTML to prevent XSS attacks
        const sanitizedHTML = sanitizeHTML(generatedHTML);

        // Display the sanitized generated content
        elements.generatedContent.innerHTML = sanitizedHTML;

        // Add click handlers to generated links and buttons for SPA behavior
        const links = elements.generatedContent.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                handleInteraction(link);
            });
        });

        // Add click handlers to buttons (except those with explicit onclick that use alerts/simple interactions)
        const buttons = elements.generatedContent.querySelectorAll('button');
        buttons.forEach(button => {
            // Only add navigation handler if button doesn't have onclick attribute
            // (to allow for simple inline interactions like dice rolls)
            if (!button.hasAttribute('onclick')) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    handleInteraction(button);
                });
            }
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

// Handle interactive element clicks in generated content (links, buttons, etc.)
async function handleInteraction(element) {
    // Sanitize inputs to prevent prompt injection
    const elementText = sanitizePromptText(element.textContent);
    const elementContext = sanitizePromptText(
        element.getAttribute('href') || 
        element.getAttribute('data-context') || 
        element.getAttribute('title') || 
        element.tagName.toLowerCase() ||
        'unknown'
    );

    // Show loading state (escape HTML for safe display)
    const escapedElementText = escapeHTML(elementText);
    elements.generatedContent.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading: ${escapedElementText}...</p>
        </div>
    `;

    elements.regenerateBtn.disabled = true;

    try {
        const prompt = `The user interacted with an element labeled "${elementText}" (context: "${elementContext}"). 
        
        Generate the next part of this experience. Continue in the same style/format as the current experience, or evolve it naturally based on the interaction.
        
        You have COMPLETE creative freedom to:
        - Continue the current experience type (game, story, interface, etc.)
        - Evolve or transform the experience based on this choice
        - Maintain consistency with the previous context or diverge creatively
        - Choose the appropriate interaction model (links, buttons, forms, etc.)
        - Decide how many interactive elements are needed for this next step
        
        CRITICAL TECHNICAL REQUIREMENTS:
        - Your response MUST be ONLY valid HTML content
        - Do NOT include <html>, <head>, or <body> tags
        - Do NOT include any explanatory text before or after the HTML
        - Start immediately with HTML tags
        
        Make this feel like a natural and engaging continuation. Match the tone and style of the overall experience while adding new depth, surprises, or developments.`;

        const generatedHTML = await state.aiProvider.generateContent(prompt);

        // Sanitize the AI-generated HTML to prevent XSS attacks
        const sanitizedHTML = sanitizeHTML(generatedHTML);

        elements.generatedContent.innerHTML = sanitizedHTML;

        // Add click handlers to new links and buttons
        const links = elements.generatedContent.querySelectorAll('a');
        links.forEach(newLink => {
            newLink.addEventListener('click', (e) => {
                e.preventDefault();
                handleInteraction(newLink);
            });
        });

        const buttons = elements.generatedContent.querySelectorAll('button');
        buttons.forEach(button => {
            // Only add navigation handler if button doesn't have onclick attribute
            if (!button.hasAttribute('onclick')) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    handleInteraction(button);
                });
            }
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
