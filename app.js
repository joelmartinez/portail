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
                // Convert onclick alert handlers on buttons to data attributes for action handling
                if (attr.name === 'onclick' && el.tagName.toLowerCase() === 'button') {
                    const onclickValue = attr.value;
                    
                    // Normalize to prevent encoding-based bypasses
                    // This handles Unicode escapes like \u0065val and other encoding tricks
                    let normalizedValue = onclickValue;
                    try {
                        // Try to decode any Unicode/hex escapes
                        normalizedValue = onclickValue.replace(/\\u([\dA-Fa-f]{4})/g, (match, hex) => {
                            return String.fromCharCode(parseInt(hex, 16));
                        });
                        normalizedValue = normalizedValue.replace(/\\x([\dA-Fa-f]{2})/g, (match, hex) => {
                            return String.fromCharCode(parseInt(hex, 16));
                        });
                    } catch (e) {
                        // If decoding fails, use original value
                    }
                    
                    // Check for dangerous keywords and patterns (using normalized value)
                    // Block semicolons to prevent statement chaining
                    const hasDangerousKeywords = /(\beval\b|\bFunction\b|javascript:|<script\b|\.constructor|\bprototype\b|__proto__|location\.|document\.|window\.|globalThis\.|cookie|import\s|require\(|\bthis\b|;)/i.test(normalizedValue);
                    
                    // Must start with alert( and end with ) - nothing else allowed  
                    const isValidAlertCall = /^alert\s*\(.+\)\s*$/.test(normalizedValue.trim());
                    
                    // If Math is used, ensure it's only calling safe methods (no property access to constructor etc.)
                    const usesMath = /\bMath\b/i.test(normalizedValue);
                    let usesSafeMathOnly = true;
                    if (usesMath) {
                        // Math is used - ensure only safe Math methods are called
                        const safeMathPattern = /\bMath\.(floor|ceil|round|random|abs|min|max|pow|sqrt|sign)\b/i;
                        const mathUsages = normalizedValue.match(/Math\.\w+/gi) || [];
                        usesSafeMathOnly = mathUsages.every(usage => safeMathPattern.test(usage));
                    }
                    
                    // If it's a valid alert call, convert it to a data attribute for action handling
                    // This allows the button to trigger a new experience generation instead of just showing an alert
                    if (isValidAlertCall && !hasDangerousKeywords && usesSafeMathOnly) {
                        // Extract the message from alert(...)
                        // Find content between first ( after 'alert' and the matching closing )
                        const alertStart = normalizedValue.indexOf('(');
                        const alertEnd = normalizedValue.lastIndexOf(')');
                        if (alertStart !== -1 && alertEnd !== -1 && alertEnd > alertStart) {
                            const alertMessage = normalizedValue.substring(alertStart + 1, alertEnd).trim();
                            el.setAttribute('data-action-type', 'alert');
                            el.setAttribute('data-alert-message', alertMessage);
                        }
                    }
                    
                    // Always remove the onclick handler for security
                    el.removeAttribute(attr.name);
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

// Constants for context extraction
const MAX_CONTEXT_LENGTH = 100; // Maximum characters for context ID
const MIN_MEANINGFUL_TEXT_LENGTH = 10; // Minimum text length to be considered meaningful

// Extract meaningful context from HTML content for use as contextId
function extractContextFromHTML(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Try to find a heading (h1, h2, h3, etc.)
    for (let i = 1; i <= 6; i++) {
        const heading = temp.querySelector(`h${i}`);
        if (heading && heading.textContent.trim()) {
            return heading.textContent.trim().slice(0, MAX_CONTEXT_LENGTH);
        }
    }
    
    // Try to find a title attribute or data-title
    const elementWithTitle = temp.querySelector('[data-title], [title]');
    if (elementWithTitle) {
        const title = elementWithTitle.getAttribute('data-title') || elementWithTitle.getAttribute('title');
        if (title && title.trim()) {
            return title.trim().slice(0, MAX_CONTEXT_LENGTH);
        }
    }
    
    // Try to find the first paragraph with meaningful content
    const paragraphs = temp.querySelectorAll('p');
    for (const p of paragraphs) {
        const text = p.textContent.trim();
        if (text && text.length > MIN_MEANINGFUL_TEXT_LENGTH) {
            return text.slice(0, MAX_CONTEXT_LENGTH);
        }
    }
    
    // Try to find any text content
    const allText = temp.textContent.trim();
    if (allText) {
        // Take the first meaningful line
        const firstLine = allText.split('\n')[0].trim();
        if (firstLine) {
            return firstLine.slice(0, MAX_CONTEXT_LENGTH);
        }
    }
    
    // Fallback to "Initial Experience" if we couldn't extract anything
    return 'Initial Experience';
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
    selectedModel: 'gpt-4o-mini',
    history: [],
    currentHistoryIndex: -1,
    isNavigating: false
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
    resetBtn: document.getElementById('reset-btn'),
    historyPanel: document.getElementById('history-panel'),
    toggleHistoryBtn: document.getElementById('toggle-history-btn'),
    historyList: document.getElementById('history-list')
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
            state.history = [];
            state.currentHistoryIndex = -1;
            elements.apiKeyInput.value = '';
            elements.acknowledgeCheckbox.checked = false;
            elements.proceedBtn.disabled = true;
            showScreen('warning');
        }
    });

    // History panel toggle
    elements.toggleHistoryBtn.addEventListener('click', () => {
        elements.historyPanel.classList.toggle('collapsed');
    });

    // Browser back/forward navigation
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.historyIndex !== undefined) {
            navigateToHistoryIndex(event.state.historyIndex);
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

// History Management Functions
function addToHistory(experience) {
    // If we're not at the end of history (user went back), remove forward history
    if (state.currentHistoryIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.currentHistoryIndex + 1);
    }

    // Add new experience to history
    state.history.push(experience);
    state.currentHistoryIndex = state.history.length - 1;

    // Update browser history
    const historyState = {
        historyIndex: state.currentHistoryIndex
    };
    
    if (state.currentHistoryIndex === 0) {
        // Replace state for first entry
        window.history.replaceState(historyState, '', window.location.href);
    } else {
        // Push new state for subsequent entries
        window.history.pushState(historyState, '', window.location.href);
    }

    updateHistoryUI();
}

function navigateToHistoryIndex(index) {
    if (index < 0 || index >= state.history.length) {
        return;
    }

    state.isNavigating = true;
    state.currentHistoryIndex = index;

    const experience = state.history[index];
    displayExperience(experience);

    updateHistoryUI();
    state.isNavigating = false;
}

function displayExperience(experience) {
    // Sanitize and display the saved HTML
    const sanitizedHTML = sanitizeHTML(experience.html);
    elements.generatedContent.innerHTML = sanitizedHTML;

    // Add click handlers to links and buttons
    const links = elements.generatedContent.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            handleInteraction(link, experience.contextId);
        });
    });

    const buttons = elements.generatedContent.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            handleInteraction(button, experience.contextId);
        });
    });
}

function updateHistoryUI() {
    const historyList = elements.historyList;

    if (state.history.length === 0) {
        historyList.innerHTML = '<p class="history-empty">No history yet</p>';
        return;
    }

    // Build history list from oldest to newest
    let historyHTML = '';
    state.history.forEach((item, index) => {
        const isActive = index === state.currentHistoryIndex;
        const activeClass = isActive ? ' active' : '';
        
        // Escape HTML for safe display
        const escapedContext = escapeHTML(item.contextId);
        
        historyHTML += `
            <div class="history-item${activeClass}" data-index="${index}">
                <div class="history-item-index">#${index + 1}</div>
                <div class="history-item-context">${escapedContext}</div>
            </div>
        `;
    });

    historyList.innerHTML = historyHTML;

    // Add click handlers to history items
    const historyItems = historyList.querySelectorAll('.history-item');
    historyItems.forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.getAttribute('data-index'));
            if (index !== state.currentHistoryIndex) {
                // Update browser history
                window.history.pushState(
                    { historyIndex: index },
                    '',
                    window.location.href
                );
                navigateToHistoryIndex(index);
            }
        });
    });
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

        // Extract a meaningful context ID from the generated content
        const contextId = extractContextFromHTML(sanitizedHTML);

        // Add to history
        addToHistory({
            html: sanitizedHTML,
            contextId: contextId,
            timestamp: new Date().toISOString()
        });

        // Display the sanitized generated content
        displayExperience({
            html: sanitizedHTML,
            contextId: contextId
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
async function handleInteraction(element, parentContextId = '') {
    // Sanitize inputs to prevent prompt injection
    const elementText = sanitizePromptText(element.textContent);
    const elementContext = sanitizePromptText(
        element.getAttribute('href') || 
        element.getAttribute('data-context') || 
        element.getAttribute('title') || 
        element.tagName.toLowerCase() ||
        'unknown'
    );

    // Build context ID chain
    const newContextId = parentContextId 
        ? `${parentContextId} -> ${elementText}`
        : elementText;

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

IMPORTANT CONTEXT CHAIN - Maintain continuity with this thread of choices:
${newContextId}

This context chain represents the user's journey through this experience. Each step should acknowledge and build upon the previous choices to maintain narrative and thematic coherence.

Generate the next part of this experience. Continue in the same style/format as the current experience, or evolve it naturally based on the interaction WHILE MAINTAINING THE CONTEXT ESTABLISHED BY THE CHAIN ABOVE.

You have COMPLETE creative freedom to:
- Continue the current experience type (game, story, interface, etc.)
- Evolve or transform the experience based on this choice
- Maintain consistency with the previous context chain
- Choose the appropriate interaction model (links, buttons, forms, etc.)
- Decide how many interactive elements are needed for this next step

CRITICAL: Remember the context chain. If this is part of a story about recruiting warriors for an adventuring party, don't forget that original goal. If this is exploring a museum, remember which exhibits have been visited. Keep the thread alive.

CRITICAL TECHNICAL REQUIREMENTS:
- Your response MUST be ONLY valid HTML content
- Do NOT include <html>, <head>, or <body> tags
- Do NOT include any explanatory text before or after the HTML
- Start immediately with HTML tags

Make this feel like a natural and engaging continuation that respects and builds upon the journey represented in the context chain.`;

        const generatedHTML = await state.aiProvider.generateContent(prompt);

        // Sanitize the AI-generated HTML to prevent XSS attacks
        const sanitizedHTML = sanitizeHTML(generatedHTML);

        // Add to history
        addToHistory({
            html: sanitizedHTML,
            contextId: newContextId,
            timestamp: new Date().toISOString()
        });

        // Display the experience
        displayExperience({
            html: sanitizedHTML,
            contextId: newContextId
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
