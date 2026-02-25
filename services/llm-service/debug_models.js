const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config(); // Load .env from current dir

async function debugModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("API Key missing!");
        return;
    }
    console.log("Using API Key:", apiKey.substring(0, 5) + "...");

    // Try default (v1beta usually)
    try {
        console.log("\n--- Testing Default (likely v1beta) ---");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        await model.generateContent("Hello?");
        console.log("SUCCESS: gemini-1.5-flash works on default/v1beta");
    } catch (e) {
        console.error("FAILED to use gemini-1.5-flash on default:", e.message);
    }

    try {
        console.log("\n--- Testing gemini-pro on Default ---");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        await model.generateContent("Hello?");
        console.log("SUCCESS: gemini-pro works on default");
    } catch (e) {
        console.error("FAILED to use gemini-pro on default:", e.message);
    }

    // Try forcing v1
    try {
        console.log("\n--- Testing v1 API Version ---");
        const genAI = new GoogleGenerativeAI(apiKey); // SDK might not support apiVersion in config directly anymore?
        // Actually, the SDK constructor takes (apiKey) or (prompt). apiVersion support depends on version.
        // Let's check available models if possible or infer from error.
    } catch (e) {
        console.log("Error testing v1:", e.message);
    }
}

debugModels();
