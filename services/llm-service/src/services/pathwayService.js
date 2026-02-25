const axios = require('axios');

// Resolve Pathway URL: pathway-processor is for Docker internal, localhost is for host/Windows
const PATHWAY_URL = process.env.PATHWAY_URL || 'http://localhost:8081';

const query = async (text) => {
    try {
        const queryUrl = `${PATHWAY_URL}/v1/retrieve`;
        console.log(`Querying Pathway RAG at: ${queryUrl}`);

        const response = await axios.post(queryUrl, {
            query: text,
            k: 3 // Retrieve top 3 relevant chunks
        }, { timeout: 5000 }); // 5 second timeout

        // Pathway VectorStoreServer returns an array of results
        if (response.data && Array.isArray(response.data)) {
            const context = response.data.map(item => item.text || item.chunk || JSON.stringify(item)).join('\n---\n');
            return context || "No relevant document matches found.";
        }

        // Handle case where response is an object with results key
        if (response.data && response.data.results) {
            const context = response.data.results.map(item => item.text || item.chunk || JSON.stringify(item)).join('\n---\n');
            return context || "No relevant document matches found.";
        }

        return "No relevant context found in documents.";
    } catch (error) {
        console.warn('Pathway RAG Query Failed:', error.message);
        // Fallback: don't crash the whole chat if RAG is down
        return "Note: Document context is currently unavailable. The AI will use general knowledge.";
    }
};

module.exports = { query };
