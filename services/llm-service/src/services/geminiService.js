const { GoogleGenerativeAI } = require("@google/generative-ai");

const getGeminiClient = () => {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY not found. LLM features will be limited.");
        return null;
    }
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

const genAI = getGeminiClient();

const generateAnswer = async (query, context, history = []) => {
    if (!genAI) {
        return "Gemini API Key is missing. Please configure GEMINI_API_KEY in .env.";
    }

    const prompt = `
You are a helpful financial assistant using Pathway RAG. 

Context from user documents:
${context || 'No specific document context found.'}

User Question: ${query}

Provide a clear, concise, and helpful answer based on the context above. If the context doesn't contain the answer, use your general financial knowledge but mention that it's general advice.
    `;

    // Try multiple models in order — if one is rate-limited, try the next
    const models = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash-lite"];

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            // If rate limited (429), try next model immediately — no waiting
            if (error.message && error.message.includes("429")) {
                console.warn(`Rate limited on ${modelName}, trying next model...`);
                continue;
            }
            // If model not found (404), try next model
            if (error.message && error.message.includes("404")) {
                console.warn(`Model ${modelName} not found, trying next...`);
                continue;
            }
            // Any other error — return friendly message immediately
            console.error('Gemini Service Error:', error.message);
            return `I'm having trouble right now. (${error.message})`;
        }
    }

    // All models exhausted
    return "All AI models are currently rate-limited. Please wait a minute and try again.";
};

module.exports = { generateAnswer };
