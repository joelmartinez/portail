/**
 * AI Provider Module
 * Abstracts AI service interactions to support multiple providers
 */

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
        this.defaultModel = config.model || 'gpt-3.5-turbo';
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
                        content: 'You are a creative HTML content generator. Generate engaging, unique HTML content for an experimental web experience. Always create something completely different and unexpected. IMPORTANT: Return ONLY valid HTML content that can be inserted into a <div> element. Do NOT include <html>, <head>, or <body> tags. The HTML should be complete and ready to render within a container div.'
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

        return data.choices[0].message.content;
    }

    static getAvailableModels() {
        return [
            { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model, best quality' },
            { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', description: 'Faster GPT-4 with larger context' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient (recommended)' },
            { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16K', description: 'Extended context length' }
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
