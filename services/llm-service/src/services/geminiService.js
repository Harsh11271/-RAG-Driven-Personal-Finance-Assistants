const { GoogleGenerativeAI } = require("@google/generative-ai");

const getGeminiClient = () => {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY not found. LLM features will be limited.");
        return null;
    }
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

const genAI = getGeminiClient();
const promptBuilder = require('./promptBuilder');

const generateAnswer = async (query, context, history = []) => {
    if (!genAI) {
        return "Gemini API Key is missing. Please configure GEMINI_API_KEY in .env.";
    }

    const systemPrompt = promptBuilder.buildFinancialPrompt(
        Array.isArray(context) ? context : [{ source: 'RAG DB', text: context }]
    );

    const prompt = `${systemPrompt}\n\nUser Question: ${query}\n\nAnswer concisely based ON THE CONTEXT above. Provide actual amounts if found in the bank statements.`;
    console.log("=== GEMINI PROMPT ===", prompt.substring(0, 500) + "...\n=====================");

    const MODEL_NAME = "gemini-2.5-flash";
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Try once, retry once after 5s if rate-limited
    for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
            console.log("Rate-limited. Waiting 5s before retry...");
            await sleep(5000);
        }
        try {
            const model = genAI.getGenerativeModel({ model: MODEL_NAME });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            if (error.message && (error.message.includes("429") || error.message.includes("503"))) {
                console.warn(`Rate limited on ${MODEL_NAME} (attempt ${attempt + 1})`);
                continue;
            }
            console.error('Gemini Service Error:', error.message);
            return `I'm having trouble right now. (${error.message})`;
        }
    }

    return "AI is temporarily unavailable due to rate limits. Please try again in a minute.";
};

module.exports = { generateAnswer };

