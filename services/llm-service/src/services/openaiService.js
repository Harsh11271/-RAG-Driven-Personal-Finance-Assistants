const OpenAI = require('openai');

const getOpenAIClient = () => {
    if (!process.env.OPENAI_API_KEY) {
        console.warn("OPENAI_API_KEY not found. LLM features will be limited.");
        return null;
    }
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

const openai = getOpenAIClient();

const generateAnswer = async (query, context, history = []) => {
    if (!openai) {
        return "OpenAI API Key is missing. Please configure it in .env.";
    }

    try {
        const messages = [
            {
                role: 'system',
                content: `You are a helpful financial assistant. 
                
Context from user documents:
${context || 'No specific document context found.'}

Provide a clear, concise, and helpful answer based on the context provided. If the context doesn't contain the answer, use your general financial knowledge but mention that it's general advice.`
            },
            { role: 'user', content: query },
        ];

        const completion = await openai.chat.completions.create({
            messages: messages,
            model: 'gpt-4o', // Upgrading to 4o for better performance if key supports it, fallback to 3.5-turbo if needed
        });

        return completion.choices[0].message.content;
    } catch (error) {
        if (error.status === 401 || error.code === 'invalid_api_key') {
            return "Unauthorized: Your OpenAI API Key is invalid. Please check your .env file.";
        }
        console.error('OpenAI Error:', error);
        return "I'm having trouble connecting to my brain right now. Make sure your OpenAI API Key is valid.";
    }
};

module.exports = { generateAnswer };
