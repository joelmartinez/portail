/**
 * AI Provider Module
 * Abstracts AI service interactions to support multiple providers
 */

// Prompt for generating random theme
const THEME_GENERATION_PROMPT = `Generate a single, unique theme for an interactive web experience. Return ONLY the theme name (1-3 words), nothing else. Be creative and diverse. Consider themes like:
- Fantasy (medieval, high fantasy, dark fantasy, fairy tale)
- Sci-fi (cyberpunk, space opera, post-apocalyptic, time travel)
- Horror (cosmic, psychological, gothic, survival)
- Historical (ancient civilizations, specific eras, alternate history)
- Mundane (everyday life, slice of life, ordinary situations made interesting)
- Surreal (dreamscapes, abstract concepts, nonsensical logic)
- Mystery (noir, detective, conspiracy, puzzle)
- Adventure (exploration, treasure hunting, survival)
- Comedy (absurd, satirical, parody, slapstick)
- Romance (various settings and tones)
- Educational (science, art, history, skills)
- Professional (corporate, bureaucratic, technical)
- Cultural (specific regions, traditions, subcultures)
- Nature (wilderness, oceanic, cosmic, microscopic)
- Technological (retro computing, AI, virtual reality, hacking)
- Philosophical (existential, ethical dilemmas, thought experiments)
- Supernatural (magic, occult, paranormal, mythology)
- Sports/Games (traditional sports, esports, board games, competitions)
- Social (communities, relationships, networks, hierarchies)
- Or any other creative theme you can imagine

Return just the theme name.`;

// Prompt for generating random experience type
const EXPERIENCE_TYPE_GENERATION_PROMPT = `Generate a single, unique experience type/format for an interactive web application. Return ONLY the experience type (2-5 words), nothing else. Be creative and diverse. Consider formats like:
- Interactive story with branching paths
- Text-based adventure game
- Point-and-click exploration
- Turn-based battle system
- Puzzle or logic challenge
- Visual novel with choices
- Simulation or management interface
- Terminal or command-line interface
- Vintage computer or retro OS
- Interactive museum or gallery
- Personal blog or journal
- Email inbox or messaging app
- Social media feed or profile
- News broadcast or article
- Educational tutorial or lesson
- Quiz or trivia game
- Inventory management system
- Character creation screen
- Shop or marketplace interface
- Map with explorable locations
- Timeline of events
- Database or archive browser
- Form or application process
- Chat conversation interface
- Recipe or cookbook format
- Travel guide or brochure
- Instruction manual or guide
- Research paper or documentation
- Support ticket system
- Calendar or scheduling app
- Dashboard or analytics view
- Creative writing prompt generator
- Music player or audio experience
- Art gallery or portfolio
- Escape room or locked box puzzle
- Choose-your-own-adventure book
- Interactive comic or graphic novel
- Tabletop RPG session
- Card game or deck builder
- Strategy game board
- Or any other creative format you can imagine

Return just the experience type.`;

// System prompt for OpenAI content generation
const OPENAI_SYSTEM_PROMPT = `You are a wildly creative experience designer with complete control over the user experience. You're not just generating content - you're crafting unique, interactive experiences that can be ANYTHING you imagine.

CRITICAL TECHNICAL REQUIREMENTS:
1. Return ONLY valid HTML content - no explanatory text, no markdown formatting, no code blocks
2. Start your response immediately with an HTML tag (like <div>, <h1>, etc.)
3. Do NOT include <html>, <head>, or <body> tags
4. The HTML will be inserted directly into a <div> container

YOUR CREATIVE FREEDOM:
You are the driver. You decide the genre, format, interaction model, and modality. Each experience should be wildly different and creative. Don't limit yourself to common patterns - be bold, experimental, and unexpected.

CRITICAL - AVOID REPETITIVE PATTERNS:
- DO NOT default to "3 button choices" every time
- DO NOT always create "choose your own adventure" structures
- VARY the number of interactive elements: sometimes 1, sometimes 2, sometimes 5, sometimes 10+
- Mix up layouts: blogs with multiple article links, dashboards with many widgets, forms with fields, grids of items, lists, tables, maps with locations
- Create different modalities: read-only content, input forms, drag-and-drop interfaces, hover interactions, click-to-reveal

INTERACTION MODELS - BE DIVERSE:
The interaction model should match the experience type. You have complete flexibility:
- **News/Blog**: Multiple article headlines as links, maybe 8-15 articles
- **Dashboard**: Grid of widgets, each clickable for details (6-12 widgets)
- **Game**: Could be a board, card grid, inventory list, stat screens
- **Form/Application**: Input fields, dropdowns, checkboxes, submit buttons
- **Terminal**: Command input with history of previous commands
- **Museum/Gallery**: Grid or list of exhibits/artworks (8-20 items)
- **Email/Messaging**: List of messages, each clickable
- **Map/Explorer**: SVG map with 5-15 clickable locations
- **Shop**: Product grid with 10-20 items
- **Social Feed**: 7-12 posts with various interaction points
- **Timeline**: Events spread across a visual timeline
- **Quiz**: Questions with multiple choice options (but not always 3!)
- **Puzzle**: Visual grid or interactive elements
- Choose your adventure: Sometimes, but NOT the default

VISUAL & INTERACTIVE ELEMENTS:
- Use inline CSS for styling to create unique aesthetics matching your theme
- Generate inline SVG for illustrations, icons, diagrams, maps, or UI elements
- Create ASCII art for retro terminals or text-based adventures
- Use creative layouts (tables, grids, flexbox, etc.)
- Add visual flair that matches the theme and format
- Include any UI elements needed (progress bars, status indicators, counters, etc.)
- Use emojis strategically if they fit the experience

TECHNICAL CAPABILITIES:
- Use data-* attributes to store state or context for navigation
- Create interactive elements - all interactions will trigger new experience generation
- Build responsive layouts that work across devices
- Use semantic HTML5 appropriately
- Generate unique IDs or classes for styling

LAYOUT EXAMPLES TO INSPIRE VARIETY:
1. Blog: Header with title, then 8-12 article summaries as clickable links
2. Dashboard: 2x3 or 3x3 grid of metric cards, each interactive
3. Terminal: Black background, green text, command prompt, history of 5-8 previous commands
4. Email: Inbox UI with 10-15 email previews in a list
5. Museum: Gallery grid with 12-16 exhibit thumbnails
6. Game Board: Visual grid (chess, tic-tac-toe scaled up, match-3 style)
7. Form: Multi-field form with 5-10 inputs and validation messages
8. Map: SVG-based map with 8-12 location markers
9. News Site: Headline layout with feature article + 10 smaller stories
10. Social Feed: Timeline with 8-10 posts of varying types

TONE & STYLE:
Match your tone to the experience type and theme. Be immersive. Be unexpected. Be creative. Make each generation feel like entering a completely different world or interface. The user should be delighted, surprised, intrigued, or mystified by what you create.

Remember: YOU are in control of the experience. Don't default to safe choices. Be bold. Be weird. Be creative. Make something memorable. AVOID THE "3 BUTTONS" TRAP.`;

class AIProvider {
    constructor(apiKey, config = {}) {
        this.apiKey = apiKey;
        this.config = config;
    }

    async validate() {
        throw new Error('validate() must be implemented by provider');
    }

    async generateContent(prompt, options = {}) {
        throw new Error('generateContent() must be implemented by provider');
    }

    static getAvailableModels() {
        throw new Error('getAvailableModels() must be implemented by provider');
    }
}

class OpenAIProvider extends AIProvider {
    constructor(apiKey, config = {}) {
        super(apiKey, config);
        this.baseURL = 'https://api.openai.com/v1';
        this.defaultModel = config.model || 'gpt-4o-mini';
        this.temperature = config.temperature || 0.8;
        this.maxTokens = config.maxTokens || this.getDefaultMaxTokens(config.model || 'gpt-4o-mini');
    }

    /**
     * Get default max tokens based on model capabilities
     * Models have different context windows, so we can use more tokens for generation
     * @param {string} model - The model name
     * @returns {number} Default max tokens for the model
     */
    getDefaultMaxTokens(model) {
        // Context windows: GPT-4o, GPT-4o-mini, GPT-4-turbo: 128K
        // GPT-4: 32K (some deployments have 128K)
        // We use a reasonable portion of context for output to leave room for prompts
        const modelTokenLimits = {
            'gpt-4o-mini': 16000,      // 128K context, use ~16K for complex generations
            'gpt-4o': 16000,           // 128K context, use ~16K for complex generations  
            'gpt-4-turbo': 16000,      // 128K context, use ~16K for complex generations
            'gpt-4': 8000              // 32K context, use ~8K for complex generations
        };
        
        return modelTokenLimits[model] || 4000; // Default for unknown models
    }

    async validate() {
        try {
            const response = await fetch(`${this.baseURL}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Invalid API key. Please check your key and try again.');
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again in a moment.');
                } else {
                    throw new Error(`API error: ${response.status}. Please try again.`);
                }
            }

            return true;
        } catch (error) {
            if (error.message.includes('API error') || error.message.includes('Invalid API key')) {
                throw error;
            }
            throw new Error('Network error. Please check your connection and try again.');
        }
    }

    async generateContent(prompt, options = {}) {
        const model = options.model || this.defaultModel;
        const temperature = options.temperature !== undefined ? options.temperature : this.temperature;
        const maxTokens = options.maxTokens || this.maxTokens;

        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: OPENAI_SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: temperature,
                max_tokens: maxTokens
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Validate response structure
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            throw new Error('Invalid response structure from OpenAI API');
        }

        let content = data.choices[0].message.content;

        // Parse and clean the response to extract only HTML content
        // Remove markdown code blocks if present
        content = content.replace(/```html\n?/gi, '').replace(/```\n?/g, '');
        
        // Remove common explanatory prefixes
        const explanatoryPrefixes = [
            /^here'?s?\s+(the\s+)?html(\s+content)?[:\s]*/i,
            /^here'?s?\s+what\s+i\s+created[:\s]*/i,
            /^i'?ve\s+created[:\s]*/i,
            /^below\s+is[:\s]*/i,
            /^this\s+is[:\s]*/i
        ];
        
        for (const prefix of explanatoryPrefixes) {
            content = content.replace(prefix, '');
        }
        
        // Trim whitespace
        content = content.trim();
        
        // If content starts with a div, extract the first complete div element
        // This is a simple depth-counter parser optimized for AI-generated HTML
        // that follows our prompt guidelines (clean HTML, no explanatory text)
        // Limitations: Assumes standard HTML format, may not handle edge cases like
        // '<div' appearing in attribute values or self-closing divs
        // However, these cases are unlikely given our specific AI prompt instructions
        if (content.toLowerCase().startsWith('<div')) {
            let depth = 0;
            let endPos = -1;
            let i = 0;
            
            while (i < content.length) {
                const remaining = content.substring(i).toLowerCase();
                
                if (remaining.startsWith('<div')) {
                    depth++;
                    i += 4; // skip '<div' - attributes don't affect tag detection
                } else if (remaining.startsWith('</div>')) {
                    depth--;
                    if (depth === 0) {
                        endPos = i + 6; // include '</div>'
                        break;
                    }
                    i += 6; // skip '</div>'
                } else {
                    i++;
                }
            }
            
            if (endPos > 0) {
                content = content.substring(0, endPos);
            }
        }

        return content;
    }

    /**
     * Generate a random theme for an experience
     * @returns {Promise<string>} A theme name
     */
    async generateTheme() {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.defaultModel,
                messages: [
                    {
                        role: 'user',
                        content: THEME_GENERATION_PROMPT
                    }
                ],
                temperature: 1.0, // High creativity for diverse theme selection
                max_tokens: 40 // Allow for longer theme names (1-3 words with tokenization overhead)
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            throw new Error('Invalid response structure from OpenAI API');
        }

        return data.choices[0].message.content.trim();
    }

    /**
     * Generate a random experience type for an experience
     * @returns {Promise<string>} An experience type
     */
    async generateExperienceType() {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.defaultModel,
                messages: [
                    {
                        role: 'user',
                        content: EXPERIENCE_TYPE_GENERATION_PROMPT
                    }
                ],
                temperature: 1.0, // High creativity for diverse type selection
                max_tokens: 60 // Allow for longer experience type names (2-5 words with tokenization overhead)
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            throw new Error('Invalid response structure from OpenAI API');
        }

        return data.choices[0].message.content.trim();
    }

    static getAvailableModels() {
        return [
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Affordable, fast, and capable (recommended)' },
            { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model - multimodal and fast' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High capability with large context' },
            { id: 'gpt-4', name: 'GPT-4', description: 'Previous flagship model' }
        ];
    }
}

// Factory function to create provider instances
function createAIProvider(providerType, apiKey, config) {
    switch (providerType) {
        case 'openai':
            return new OpenAIProvider(apiKey, config);
        // Future providers can be added here:
        // case 'anthropic':
        //     return new AnthropicProvider(apiKey, config);
        // case 'google':
        //     return new GoogleProvider(apiKey, config);
        default:
            throw new Error(`Unknown provider type: ${providerType}`);
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIProvider, OpenAIProvider, createAIProvider };
}
