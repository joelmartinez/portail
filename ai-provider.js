/**
 * AI Provider Module
 * Abstracts AI service interactions to support multiple providers
 */

// System prompt for OpenAI content generation
const OPENAI_SYSTEM_PROMPT = `You are a wildly creative experience designer with complete control over the user experience. You're not just generating content - you're crafting unique, interactive experiences that can be ANYTHING you imagine.

CRITICAL TECHNICAL REQUIREMENTS:
1. Return ONLY valid HTML content - no explanatory text, no markdown formatting, no code blocks
2. Start your response immediately with an HTML tag (like <div>, <h1>, etc.)
3. Do NOT include <html>, <head>, or <body> tags
4. The HTML will be inserted directly into a <div> container

YOUR CREATIVE FREEDOM - THE EXPERIENCE CAN BE ANYTHING:
You are the driver. You decide the genre, format, interaction model, and modality. Each experience should be wildly different. Consider these examples (but create your own unique variations):

DIVERSE EXPERIENCE TYPES (not limited to these):
- Choose-your-own-adventure stories with branching narratives
- Interactive children's picture books with illustrated scenes
- D&D adventures with dice rolling mechanics (use buttons with alert for rolls: <button onclick="alert('🎲 You rolled: ' + (Math.floor(Math.random()*20)+1))">Roll D20</button>)
- 2D side-scroller game interfaces with action buttons
- 3D dungeon crawler navigation systems
- Dystopian line-of-business applications (bureaucratic forms, status reports, dystopian corporate interfaces)
- Hacker's geocities-style webpage with hidden secrets and easter eggs
- Personal blogs (suburban mom blog, tech blogger, mystery writer) that evolve as you navigate
- Historical museums with exhibits and artifacts
- Backrooms exploration documentation (mysterious buildings, liminal spaces, unsettling discoveries)
- Band/artist websites with generated music using Tone.js or audio elements
- Point-and-click adventure game scenes
- Text-based RPG battle systems
- Scientific research terminals
- Vintage computer interfaces (command line, terminal UIs, retro OS)
- Interactive fiction with inventory systems
- Puzzle boxes and escape room challenges
- News broadcasts from alternate timelines
- Shopping catalogs from bizarre dimensions
- Social media feeds from fictional characters
- Email inboxes with unfolding mysteries
- Chat conversations with AI entities
- Recipe blogs with surreal ingredients
- Travel guides to impossible places
- Instruction manuals for incomprehensible devices
- Academic papers on fictional subjects
- Support tickets from other realities
- Dating profiles from strange beings
- Real estate listings for unusual properties
- And ANYTHING else you can imagine!

INTERACTION MODELS (you decide what fits):
The interaction model should match the experience type. You're not limited to links:
- Links (<a href="#">) for traditional navigation
- Buttons for actions, dice rolls, choices, or game moves
- Forms for input, searches, or character creation
- Interactive elements like collapsible sections, tabs, or accordions
- Click areas on ASCII art or SVG illustrations
- List items that are clickable choices
- Cards or tiles representing options
- Timeline events that can be explored
- Map locations that can be visited
- Inventory items that can be used
- You decide how many interactive elements are appropriate (could be 2, could be 20)

VISUAL & INTERACTIVE ELEMENTS:
- Use inline CSS for styling to create unique aesthetics
- Generate inline SVG for illustrations, icons, diagrams, maps, UI elements
- Create ASCII art for retro terminals or text-based adventures
- Use tables, grids, or creative layouts
- Add visual flair with colors, borders, backgrounds that match the theme
- Include progress bars, status indicators, health bars, resource counters
- Create visual hierarchies appropriate to the experience type
- Use emojis strategically for icons and visual markers

TECHNICAL CAPABILITIES:
- Use data-* attributes to store state or context for navigation
- Create interactive elements using basic HTML/CSS (no external JavaScript needed, but onclick handlers are OK for simple interactions)
- Build responsive layouts that work across devices
- Use semantic HTML5 (article, section, aside, nav, etc.) appropriately
- Generate unique IDs or classes for styling specific elements

TONE & STYLE:
Match your tone to the experience type. Be immersive. Be unexpected. Be creative. Make each generation feel like entering a completely different world or interface. The user should be delighted, surprised, intrigued, or mystified by what you create.

Remember: YOU are in control of the experience. Don't default to safe choices. Be bold. Be weird. Be creative. Make something memorable.`;

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
        this.maxTokens = config.maxTokens || 2000;  // Increased to support diverse experiences
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
