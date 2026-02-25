const promptBuilder = require('./promptBuilder');

const openaiService = require('./openaiService');
const geminiService = require('./geminiService');

class LLMClient {
    constructor() {
        this.primaryProvider = process.env.LLM_PROVIDER || 'gemini';
    }

    /**
     * Unified method to generate a response from the configured LLM provider.
     * Uses promptBuilder for consistent system prompts.
     */
    async generateAnswer(query, context, history = []) {
        if (this.primaryProvider === 'gemini') {
            return geminiService.generateAnswer(query, context, history);
        } else {
            return openaiService.generateAnswer(query, context, history);
        }
    }
}

module.exports = new LLMClient();
