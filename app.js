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
                        // Extract the message from alert(...) by finding the matching closing parenthesis
                        const alertStart = normalizedValue.indexOf('(');
                        if (alertStart !== -1) {
                            // Track parenthesis depth to find the matching closing parenthesis
                            let depth = 0;
                            let alertEnd = -1;
                            for (let i = alertStart; i < normalizedValue.length; i++) {
                                if (normalizedValue[i] === '(') {
                                    depth++;
                                } else if (normalizedValue[i] === ')') {
                                    depth--;
                                    if (depth === 0) {
                                        alertEnd = i;
                                        break;
                                    }
                                }
                            }
                            
                            if (alertEnd !== -1) {
                                const alertMessage = normalizedValue.substring(alertStart + 1, alertEnd).trim();
                                el.setAttribute('data-action-type', 'alert');
                                el.setAttribute('data-alert-message', alertMessage);
                            }
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
// NOTE: This function expects pre-sanitized HTML (already passed through sanitizeHTML)
// and only reads text content - it does not execute any scripts
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

// Extract metadata from HTML (static metadata via data-metadata attribute)
function extractMetadataFromHTML(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Look for elements with data-metadata attribute
    const metadataElement = temp.querySelector('[data-metadata]');
    if (metadataElement) {
        try {
            const metadataStr = metadataElement.getAttribute('data-metadata');
            return JSON.parse(metadataStr);
        } catch (e) {
            // Invalid JSON in data-metadata attribute - skip it
            console.warn('Invalid JSON in data-metadata attribute:', e);
        }
    }
    
    // Return empty object if no metadata found
    return {};
}

// Collect metadata from element interaction
function collectInteractionMetadata(element, parentMetadata = {}) {
    const metadata = { ...parentMetadata };
    
    // Add interaction type
    metadata.lastInteractionType = element.tagName.toLowerCase();
    
    // Collect data attributes as metadata
    Array.from(element.attributes).forEach(attr => {
        if (attr.name.startsWith('data-') && attr.name !== 'data-action-type' && attr.name !== 'data-alert-message') {
            const key = attr.name.replace('data-', '');
            try {
                // Try to parse as JSON first
                metadata[key] = JSON.parse(attr.value);
            } catch (e) {
                // JSON parsing failed - treat as plain string
                metadata[key] = attr.value;
            }
        }
    });
    
    // Track interaction count
    metadata.interactionCount = (metadata.interactionCount || 0) + 1;
    
    return metadata;
}

// Format metadata for AI prompt
function formatMetadataForPrompt(metadata) {
    if (!metadata || Object.keys(metadata).length === 0) {
        return '';
    }
    
    // Convert metadata to a readable format for the AI
    const metadataLines = Object.entries(metadata)
        .filter(([key, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
            if (typeof value === 'object') {
                return `- ${key}: ${JSON.stringify(value)}`;
            }
            return `- ${key}: ${value}`;
        });
    
    if (metadataLines.length === 0) {
        return '';
    }
    
    return `\n\nCONTEXT METADATA - Use this information to inform the next experience:
${metadataLines.join('\n')}

This metadata represents the state, choices, and context from previous interactions. Use it to create continuity and make the next experience feel personalized and contextual.`;
}

// Configuration
const CONFIG = {
    OPENAI_MODEL: 'gpt-3.5-turbo',
    TEMPERATURE: 0.8,
    MAX_TOKENS: 2000,  // Increased to support more diverse and complex experiences
    MAX_PROMPT_LENGTH: 500,  // Limit for prompt injection protection and API efficiency
    ENABLE_AGENTIC_LOOP: true,  // Enable multi-step agentic planning and execution
    MAX_AGENTIC_STEPS: 3  // Maximum number of agentic steps for complex experiences
};

// Fun status messages for agentic loop phases
const AGENTIC_STATUS_MESSAGES = {
    thinking: [
        "🤔 Contemplating the nature of existence... and your experience",
        "💭 Channeling creative energies from the digital cosmos...",
        "🎨 Sketching blueprints in the void...",
        "✨ Consulting the ancient tomes of randomness...",
        "🎲 Rolling the dice of creativity...",
        "🔮 Peering into the crystal ball of possibilities...",
        "🧙 Brewing a potion of pure imagination...",
        "🌟 Aligning the stars for your journey..."
    ],
    planning: [
        "📋 Drafting a master plan worthy of a heist movie...",
        "🗺️ Charting unexplored territories of fun...",
        "📐 Engineering the architecture of delight...",
        "🎯 Calculating optimal paths to amazement...",
        "🧩 Assembling the puzzle pieces of awesome...",
        "⚡ Supercharging the idea generator...",
        "🚀 Preparing for launch into the unknown...",
        "🎪 Coordinating a symphony of chaos..."
    ],
    building: [
        "🏗️ Constructing reality from pure thought...",
        "⚙️ Fine-tuning the gears of imagination...",
        "🎨 Painting pixels with digital brushstrokes...",
        "🔨 Hammering code into submission...",
        "🧱 Stacking experiences like LEGO bricks...",
        "🌈 Weaving rainbows into interactive tapestries...",
        "💫 Sprinkling stardust on your adventure...",
        "🎭 Setting the stage for your performance..."
    ],
    refining: [
        "✨ Polishing this gem until it shines...",
        "🔧 Adding the finishing touches...",
        "💎 Cutting the diamond to perfection...",
        "🎨 Adding that *chef's kiss* detail...",
        "🌟 Making it sparkle just a bit more...",
        "🧹 Sweeping away the rough edges...",
        "🎯 Zeroing in on perfection...",
        "🎪 Adding bells, whistles, and confetti..."
    ]
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

/**
 * Get a random message from a message category
 * @param {string} category - The category of message (thinking, planning, building, refining)
 * @returns {string} A random message from the category
 */
function getRandomStatusMessage(category) {
    const messages = AGENTIC_STATUS_MESSAGES[category] || AGENTIC_STATUS_MESSAGES.thinking;
    return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Show agentic loop status with fun messages
 * @param {string} phase - The current phase (thinking, planning, building, refining)
 * @param {string} details - Details about what's happening
 * @param {Object} metadata - Optional metadata to show (theme, experienceType, etc.)
 */
function showAgenticStatus(phase, details, metadata = {}) {
    const statusMessage = getRandomStatusMessage(phase);
    let metadataHTML = '';
    
    if (metadata.theme || metadata.experienceType) {
        metadataHTML = '<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">';
        if (metadata.theme) {
            metadataHTML += `<p style="color: var(--text-muted); font-size: 0.9rem;">Theme: <strong>${escapeHTML(metadata.theme)}</strong></p>`;
        }
        if (metadata.experienceType) {
            metadataHTML += `<p style="color: var(--text-muted); font-size: 0.9rem;">Format: <strong>${escapeHTML(metadata.experienceType)}</strong></p>`;
        }
        if (metadata.step) {
            metadataHTML += `<p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem;">Step ${metadata.step} of ${metadata.totalSteps || '?'}</p>`;
        }
        metadataHTML += '</div>';
    }
    
    elements.generatedContent.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p style="font-size: 1.1rem; margin: 1rem 0;">${statusMessage}</p>
            <p style="color: var(--text-muted); font-size: 0.95rem;">${escapeHTML(details)}</p>
            ${metadataHTML}
        </div>
    `;
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
    isNavigating: false,
    agenticLoop: {
        enabled: CONFIG.ENABLE_AGENTIC_LOOP,
        currentStep: 0,
        totalSteps: 0,
        stepHistory: []  // Track each step in the agentic loop
    }
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

    // Generate unique ID for this experience
    const experienceId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add ID and agentic step info to experience
    const enrichedExperience = {
        ...experience,
        id: experienceId,
        agenticSteps: state.agenticLoop.stepHistory.length > 0 ? [...state.agenticLoop.stepHistory] : undefined
    };

    // Add new experience to history
    state.history.push(enrichedExperience);
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
            handleInteraction(link, experience.contextId, experience.metadata || {});
        });
    });

    const buttons = elements.generatedContent.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            handleInteraction(button, experience.contextId, experience.metadata || {});
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

/**
 * Agentic Loop: Determine if we need multiple steps for a complex experience
 * @param {string} theme - The theme of the experience
 * @param {string} experienceType - The type/format of experience
 * @returns {Promise<Object>} Planning information including whether multi-step is needed
 */
async function planExperience(theme, experienceType) {
    // Expanded heuristics to recognize more experience types as complex
    // This ensures a wider variety of experiences get multi-step planning for richer results
    const complexKeywords = [
        // Games and interactive experiences
        'game', 'rpg', 'adventure', 'simulation', 'management', 'builder',
        'puzzle', 'quiz', 'battle', 'strategy', 'inventory', 'tabletop',
        'card', 'deck', 'board', 'escape', 'point-and-click', 'turn-based',
        
        // Applications and interfaces
        'form', 'application', 'system', 'interface', 'dashboard',
        'terminal', 'command', 'database', 'archive', 'ticket',
        'calendar', 'scheduling', 'analytics', 'inbox', 'messaging',
        'social', 'feed', 'profile', 'marketplace', 'shop', 'store',
        
        // Content-rich experiences
        'blog', 'news', 'article', 'broadcast', 'journal', 'museum',
        'gallery', 'exhibition', 'portfolio', 'timeline', 'documentary',
        'tutorial', 'lesson', 'guide', 'manual', 'documentation',
        'recipe', 'cookbook', 'travel', 'brochure',
        
        // Interactive media
        'interactive', 'choose', 'visual', 'novel', 'comic', 'graphic',
        'exploration', 'map', 'location', 'browser',
        
        // Special formats
        'validation', 'creation', 'character', 'retro', 'vintage', 'os'
    ];
    
    const typeWords = experienceType.toLowerCase().split(/\s+/);
    const isComplex = typeWords.some(word => 
        complexKeywords.some(keyword => word.includes(keyword))
    );
    
    // Determine number of steps (1-3)
    let steps = 1;
    if (isComplex && state.agenticLoop.enabled) {
        // Complex experiences get 2-3 steps
        steps = Math.min(CONFIG.MAX_AGENTIC_STEPS, 2 + Math.floor(Math.random() * 2));
    }
    
    return {
        needsMultipleSteps: steps > 1,
        totalSteps: steps,
        complexity: isComplex ? 'high' : 'low',
        strategy: isComplex 
            ? 'Multi-step approach: planning, building core functionality, adding interactivity'
            : 'Single-step generation'
    };
}

/**
 * Execute a single step in the agentic loop
 * @param {number} stepNumber - Current step number (1-indexed)
 * @param {number} totalSteps - Total number of steps
 * @param {string} theme - Experience theme
 * @param {string} experienceType - Experience type
 * @param {Array} previousSteps - Array of previous step results
 * @returns {Promise<Object>} Step result with HTML and metadata
 */
async function executeAgenticStep(stepNumber, totalSteps, theme, experienceType, previousSteps = []) {
    const isFirstStep = stepNumber === 1;
    const isFinalStep = stepNumber === totalSteps;
    
    // Record this step
    const stepId = `step_${Date.now()}_${stepNumber}`;
    const stepMetadata = {
        id: stepId,
        stepNumber,
        totalSteps,
        theme,
        experienceType,
        timestamp: new Date().toISOString()
    };
    
    let prompt = '';
    
    if (totalSteps === 1) {
        // Single step - generate complete experience
        showAgenticStatus('building', 'Creating your complete experience...', { theme, experienceType, step: 1, totalSteps: 1 });
        
        prompt = `Create an interactive experience with the following specifications:

THEME: ${theme}
FORMAT/TYPE: ${experienceType}

Combine these two elements to create a unique, cohesive experience. The theme should influence the content, setting, and atmosphere, while the format determines the structure and interaction model.

CRITICAL - MATCH THE FORMAT TO THE TYPE:
- If this is a "blog" or "news" format, create 8-15 article links, not 3 choices
- If this is a "dashboard" or "interface", create a grid of 6-12 interactive widgets
- If this is a "game", design the appropriate game mechanics (board, cards, stats, etc.)
- If this is a "museum" or "gallery", show 10-20 exhibits or artworks
- If this is a "terminal" or "command", include command history and input
- If this is an "email" or "messaging" app, show 8-12 messages
- If this is a "map" or "exploration", create multiple locations to visit (8-15)
- If this is a "form" or "application", include multiple fields (5-10)
- If this is a "timeline", show multiple events spread across time
- DON'T default to "3 button choices" unless that truly fits the format

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

METADATA SUPPORT (OPTIONAL):
- You can add a data-metadata attribute to any element with a JSON object containing state, stats, or context
- You can add data-* attributes to interactive elements (links, buttons) to pass custom metadata to the next experience
- For example: <button data-choice="warrior" data-strength="10">Recruit Warrior</button>
- Or: <div data-metadata='{"theme":"fantasy","level":1}'>...</div>
- This metadata will be passed to subsequent experiences to maintain continuity

Make this experience memorable, immersive, and true to both the theme and format. Be creative, bold, and surprising.`;
        
    } else if (isFirstStep) {
        // First step of multi-step - create foundation
        showAgenticStatus('planning', `Planning the foundation (Step ${stepNumber}/${totalSteps})...`, { theme, experienceType, step: stepNumber, totalSteps });
        
        prompt = `You are creating a complex interactive experience in MULTIPLE STEPS. This is STEP 1 of ${totalSteps}.

THEME: ${theme}
FORMAT/TYPE: ${experienceType}

Your task for THIS STEP: Create the FOUNDATION and CORE STRUCTURE of the experience.

For this first step:
- Set up the basic framework and introduction
- Establish the theme and setting
- Create the initial state or starting point
- Add basic interactive elements that will be enhanced in later steps
- Include data-metadata with initial state that will be built upon

CRITICAL - MATCH THE FORMAT APPROPRIATELY:
- If creating a "blog" or "news" site, set up the header and start with 5-10 article previews (will add more in later steps)
- If creating a "dashboard", establish the grid layout with initial widgets (will expand in later steps)
- If creating a "game", set up the game board/interface and initial state
- If creating a "museum" or "gallery", show the entrance with preview of exhibits (will add more in later steps)
- DON'T default to generic "3 choices" - match the actual format type

IMPORTANT: This is just the foundation. Subsequent steps will add more complexity and interactivity.

CRITICAL TECHNICAL REQUIREMENTS:
- Your response MUST be ONLY valid HTML content
- Do NOT include <html>, <head>, or <body> tags
- Do NOT include any explanatory text before or after the HTML
- Start immediately with HTML tags

METADATA: Use data-metadata to store the initial state, and data-* attributes on interactive elements to prepare for the next steps.`;
        
    } else if (isFinalStep) {
        // Final step - complete and polish
        showAgenticStatus('refining', `Adding final touches (Step ${stepNumber}/${totalSteps})...`, { theme, experienceType, step: stepNumber, totalSteps });
        
        const previousStepsContext = previousSteps.map((step, idx) => 
            `Step ${idx + 1} Result: ${step.contextSummary || 'Built foundation'}`
        ).join('\n');
        
        prompt = `You are creating a complex interactive experience in MULTIPLE STEPS. This is the FINAL STEP ${stepNumber} of ${totalSteps}.

THEME: ${theme}
FORMAT/TYPE: ${experienceType}

PREVIOUS STEPS:
${previousStepsContext}

Your task for THIS FINAL STEP: Complete and polish the experience.

For this final step:
- Build upon everything from previous steps
- Add the finishing touches and polish
- Ensure all interactive elements work together cohesively
- Add any final features that make this a complete, satisfying experience
- Make sure the experience feels polished and complete

The experience should now be fully functional and engaging.

CRITICAL TECHNICAL REQUIREMENTS:
- Your response MUST be ONLY valid HTML content
- Do NOT include <html>, <head>, or <body> tags
- Do NOT include any explanatory text before or after the HTML
- Start immediately with HTML tags

METADATA: Ensure data-metadata reflects the complete state, and all interactive elements have appropriate data-* attributes.`;
        
    } else {
        // Middle step - build upon previous
        showAgenticStatus('building', `Building features (Step ${stepNumber}/${totalSteps})...`, { theme, experienceType, step: stepNumber, totalSteps });
        
        const previousStepsContext = previousSteps.map((step, idx) => 
            `Step ${idx + 1} Result: ${step.contextSummary || 'Added features'}`
        ).join('\n');
        
        prompt = `You are creating a complex interactive experience in MULTIPLE STEPS. This is STEP ${stepNumber} of ${totalSteps}.

THEME: ${theme}
FORMAT/TYPE: ${experienceType}

PREVIOUS STEPS:
${previousStepsContext}

Your task for THIS STEP: Build upon the previous work and add more features.

For this middle step:
- Enhance what was built in previous steps
- Add more interactive functionality
- Expand the complexity and depth
- Keep building toward the complete vision
- Maintain consistency with previous steps

IMPORTANT: There are more steps after this one, so continue building but don't complete everything yet.

CRITICAL TECHNICAL REQUIREMENTS:
- Your response MUST be ONLY valid HTML content
- Do NOT include <html>, <head>, or <body> tags
- Do NOT include any explanatory text before or after the HTML
- Start immediately with HTML tags

METADATA: Update data-metadata with the evolved state, and continue using data-* attributes for interactivity.`;
    }
    
    const generatedHTML = await state.aiProvider.generateContent(prompt);
    const sanitizedHTML = sanitizeHTML(generatedHTML);
    const contextSummary = extractContextFromHTML(sanitizedHTML).substring(0, 100);
    
    stepMetadata.html = sanitizedHTML;
    stepMetadata.contextSummary = contextSummary;
    
    return stepMetadata;
}

// Generate Experience using OpenAI with Agentic Loop
async function generateExperience() {
    // Reset agentic loop state
    state.agenticLoop.stepHistory = [];
    state.agenticLoop.currentStep = 0;
    
    // Show initial loading state
    showAgenticStatus('thinking', 'Contemplating the perfect experience for you...');

    elements.regenerateBtn.disabled = true;

    try {
        // Step 1: Generate a random theme
        showAgenticStatus('thinking', 'Discovering the perfect theme...');
        const theme = await state.aiProvider.generateTheme();
        
        // Step 2: Generate a random experience type
        showAgenticStatus('thinking', 'Selecting the ideal format...', { theme });
        const experienceType = await state.aiProvider.generateExperienceType();
        
        // Step 3: Plan the experience (determine if multi-step is needed)
        showAgenticStatus('planning', 'Analyzing complexity and planning approach...', { theme, experienceType });
        const plan = await planExperience(theme, experienceType);
        
        state.agenticLoop.totalSteps = plan.totalSteps;
        
        // Step 4: Execute agentic loop
        const steps = [];
        for (let i = 1; i <= plan.totalSteps; i++) {
            state.agenticLoop.currentStep = i;
            const stepResult = await executeAgenticStep(i, plan.totalSteps, theme, experienceType, steps);
            steps.push(stepResult);
            state.agenticLoop.stepHistory.push(stepResult);
        }
        
        // Use the final step's HTML as the complete experience
        const finalStep = steps[steps.length - 1];
        const sanitizedHTML = finalStep.html;
        
        // Extract a meaningful context ID from the generated content
        const contextId = extractContextFromHTML(sanitizedHTML);
        
        // Extract metadata from the generated HTML
        const metadata = extractMetadataFromHTML(sanitizedHTML);
        
        // Add theme, experience type, and agentic info to metadata for continuity
        const enhancedMetadata = {
            ...metadata,
            theme: theme,
            experienceType: experienceType,
            agenticLoop: {
                totalSteps: plan.totalSteps,
                complexity: plan.complexity
            }
        };

        // Add to history
        addToHistory({
            html: sanitizedHTML,
            contextId: contextId,
            timestamp: new Date().toISOString(),
            metadata: enhancedMetadata
        });

        // Display the sanitized generated content
        displayExperience({
            html: sanitizedHTML,
            contextId: contextId,
            metadata: enhancedMetadata
        });

        state.generatedContent = sanitizedHTML;

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
        // Reset agentic state
        state.agenticLoop.currentStep = 0;
    }
}

// Handle interactive element clicks in generated content (links, buttons, etc.)
async function handleInteraction(element, parentContextId = '', parentMetadata = {}) {
    // Reset agentic loop state for this interaction
    state.agenticLoop.stepHistory = [];
    state.agenticLoop.currentStep = 0;
    
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
    
    // Collect metadata from this interaction
    const newMetadata = collectInteractionMetadata(element, parentMetadata);

    // Show initial loading state with fun message
    showAgenticStatus('thinking', `Processing your choice: ${elementText}...`);

    elements.regenerateBtn.disabled = true;

    try {
        // Determine if we need agentic loop for this interaction
        // Check if the current experience is complex (has agenticLoop metadata)
        const wasComplexExperience = parentMetadata.agenticLoop && parentMetadata.agenticLoop.complexity === 'high';
        const shouldUseAgenticLoop = wasComplexExperience && state.agenticLoop.enabled;
        
        // Format metadata for the prompt
        const metadataPrompt = formatMetadataForPrompt(newMetadata);
        
        let generatedHTML;
        
        if (shouldUseAgenticLoop) {
            // Multi-step approach for complex experiences
            showAgenticStatus('planning', 'Planning the next phase of this complex experience...');
            
            // Determine steps needed (1-2 for interactions)
            const steps = Math.min(2, CONFIG.MAX_AGENTIC_STEPS - 1);
            state.agenticLoop.totalSteps = steps;
            
            const stepResults = [];
            for (let i = 1; i <= steps; i++) {
                state.agenticLoop.currentStep = i;
                
                if (i === 1) {
                    showAgenticStatus('building', `Building response to your choice (Step ${i}/${steps})...`);
                } else {
                    showAgenticStatus('refining', `Polishing the experience (Step ${i}/${steps})...`);
                }
                
                const previousStepsContext = stepResults.map((step, idx) => 
                    `Step ${idx + 1}: ${step.contextSummary}`
                ).join('\n');
                
                const stepPrompt = `The user interacted with an element labeled "${elementText}" (context: "${elementContext}").

IMPORTANT CONTEXT CHAIN - Maintain continuity with this thread of choices:
${newContextId}

This context chain represents the user's journey through this experience. Each step should acknowledge and build upon the previous choices to maintain narrative and thematic coherence.${metadataPrompt}

${stepResults.length > 0 ? `PREVIOUS STEPS IN THIS INTERACTION:\n${previousStepsContext}\n\n` : ''}

${i === steps ? 'This is the FINAL step. Complete and polish the response.' : `This is step ${i} of ${steps}. Build the foundation for the response.`}

Generate the next part of this experience. Continue in the same style/format as the current experience, or evolve it naturally based on the interaction WHILE MAINTAINING THE CONTEXT ESTABLISHED BY THE CHAIN ABOVE.

You have COMPLETE creative freedom to:
- Continue the current experience type (game, story, interface, etc.)
- Evolve or transform the experience based on this choice
- Maintain consistency with the previous context chain
- Choose the appropriate interaction model (links, buttons, forms, etc.)
- Decide how many interactive elements are needed for this next step

CRITICAL: Remember the context chain. If this is part of a story about recruiting warriors for an adventuring party, don't forget that original goal. If this is exploring a museum, remember which exhibits have been visited. Keep the thread alive.

METADATA SUPPORT (OPTIONAL):
- You can add a data-metadata attribute to any element with a JSON object containing state, stats, or context
- You can add data-* attributes to interactive elements (links, buttons) to pass custom metadata to the next experience
- For example: <button data-choice="warrior" data-strength="10">Recruit Warrior</button>
- Or: <div data-metadata='{"theme":"fantasy","level":2}'>...</div>
- This metadata will be passed to subsequent experiences to maintain continuity

CRITICAL TECHNICAL REQUIREMENTS:
- Your response MUST be ONLY valid HTML content
- Do NOT include <html>, <head>, or <body> tags
- Do NOT include any explanatory text before or after the HTML
- Start immediately with HTML tags

Make this feel like a natural and engaging continuation that respects and builds upon the journey represented in the context chain.`;

                const stepHTML = await state.aiProvider.generateContent(stepPrompt);
                const sanitizedStepHTML = sanitizeHTML(stepHTML);
                const contextSummary = extractContextFromHTML(sanitizedStepHTML).substring(0, 100);
                
                const stepMetadata = {
                    id: `step_${Date.now()}_${i}`,
                    stepNumber: i,
                    html: sanitizedStepHTML,
                    contextSummary
                };
                
                stepResults.push(stepMetadata);
                state.agenticLoop.stepHistory.push(stepMetadata);
            }
            
            // Use final step as the result
            generatedHTML = stepResults[stepResults.length - 1].html;
            
        } else {
            // Single-step approach for simpler experiences
            showAgenticStatus('building', 'Creating the next part of your journey...');
            
            const prompt = `The user interacted with an element labeled "${elementText}" (context: "${elementContext}").

IMPORTANT CONTEXT CHAIN - Maintain continuity with this thread of choices:
${newContextId}

This context chain represents the user's journey through this experience. Each step should acknowledge and build upon the previous choices to maintain narrative and thematic coherence.${metadataPrompt}

Generate the next part of this experience. Continue in the same style/format as the current experience, or evolve it naturally based on the interaction WHILE MAINTAINING THE CONTEXT ESTABLISHED BY THE CHAIN ABOVE.

You have COMPLETE creative freedom to:
- Continue the current experience type (game, story, interface, etc.)
- Evolve or transform the experience based on this choice
- Maintain consistency with the previous context chain
- Choose the appropriate interaction model (links, buttons, forms, etc.)
- Decide how many interactive elements are needed for this next step

CRITICAL: Remember the context chain. If this is part of a story about recruiting warriors for an adventuring party, don't forget that original goal. If this is exploring a museum, remember which exhibits have been visited. Keep the thread alive.

METADATA SUPPORT (OPTIONAL):
- You can add a data-metadata attribute to any element with a JSON object containing state, stats, or context
- You can add data-* attributes to interactive elements (links, buttons) to pass custom metadata to the next experience
- For example: <button data-choice="warrior" data-strength="10">Recruit Warrior</button>
- Or: <div data-metadata='{"theme":"fantasy","level":2}'>...</div>
- This metadata will be passed to subsequent experiences to maintain continuity

CRITICAL TECHNICAL REQUIREMENTS:
- Your response MUST be ONLY valid HTML content
- Do NOT include <html>, <head>, or <body> tags
- Do NOT include any explanatory text before or after the HTML
- Start immediately with HTML tags

Make this feel like a natural and engaging continuation that respects and builds upon the journey represented in the context chain.`;

            generatedHTML = await state.aiProvider.generateContent(prompt);
        }

        // Sanitize the AI-generated HTML to prevent XSS attacks
        const sanitizedHTML = sanitizeHTML(generatedHTML);
        
        // Extract metadata from the new HTML
        const extractedMetadata = extractMetadataFromHTML(sanitizedHTML);
        
        // Merge with interaction metadata
        const finalMetadata = { ...newMetadata, ...extractedMetadata };

        // Add to history
        addToHistory({
            html: sanitizedHTML,
            contextId: newContextId,
            timestamp: new Date().toISOString(),
            metadata: finalMetadata
        });

        // Display the experience
        displayExperience({
            html: sanitizedHTML,
            contextId: newContextId,
            metadata: finalMetadata
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
        // Reset agentic state
        state.agenticLoop.currentStep = 0;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    showScreen('warning');
});
