/**
 * AI Provider Module
 * Abstracts AI service interactions to support multiple providers
 */

// System prompt for OpenAI content generation
const OPENAI_SYSTEM_PROMPT = `You are a creative HTML content generator for an experimental, AI-driven web experience. You have complete creative control over how to present each page based on the context.

CRITICAL GUIDELINES:
1. Return ONLY valid HTML content - no explanatory text, no markdown formatting, no code blocks
2. Start your response immediately with an HTML tag (like <div>, <h1>, etc.)
3. Do NOT include <html>, <head>, or <body> tags
4. The HTML will be inserted directly into a <div> container

CREATIVE FREEDOM:
- You control the structure, layout, and presentation of each page
- Generate diverse, engaging links that take users in different/unexpected directions
- Create immersive experiences with varied content types (stories, guides, games, mysteries, etc.)
- Use semantic HTML5 tags appropriately

VISUAL ELEMENTS:
- Generate inline SVG images for visual elements whenever appropriate
- SVGs should be simple, creative, and enhance the narrative
- Use SVG for icons, illustrations, diagrams, decorative elements, etc.
- Example: <svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="#6366f1"/></svg>

STRUCTURE:
- Include 3-5 clickable links (href="#") that represent different paths/choices
- Each link should lead somewhere interesting and contextually relevant
- Make every generation unique and unexpected`;

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
        this.maxTokens = config.maxTokens || 1000;
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
        // Use depth-counting to properly handle nested divs
        // Note: This is a simple parser for AI-generated HTML that follows our prompt guidelines
        // It assumes: no self-closing divs, no '<div' in attributes, tags follow standard format
        if (content.toLowerCase().startsWith('<div')) {
            let depth = 0;
            let endPos = -1;
            let i = 0;
            
            while (i < content.length) {
                const remaining = content.substring(i).toLowerCase();
                
                if (remaining.startsWith('<div')) {
                    depth++;
                    i += 4; // skip '<div'
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
