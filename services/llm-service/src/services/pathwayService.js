const axios = require('axios');

// Resolve Pathway URL: pathway-processor is for Docker internal, localhost is for host/Windows
const PATHWAY_URL = process.env.PATHWAY_URL || 'http://localhost:8081';

const query = async (text, userId = null, k = 3) => {
    try {
        const queryUrl = `${PATHWAY_URL}/v1/retrieve`;
        console.log(`Querying Pathway RAG at: ${queryUrl}${userId ? ` for user: ${userId}` : ''} (k=${k})`);

        const payload = {
            query: text,
            k: k
        };
        if (userId) {
            payload.userId = userId;
        }

        const response = await axios.post(queryUrl, payload, { timeout: 5000 });

        // Pathway VectorStoreServer returns an array of results
        if (response.data && Array.isArray(response.data)) {
            return response.data;
        }

        // Handle case where response is an object with results key
        if (response.data && response.data.results) {
            return response.data.results;
        }

        return [];
    } catch (error) {
        console.warn('Pathway RAG Query Failed:', error.message);
        // Fallback: don't crash the whole chat if RAG is down
        return "Note: Document context is currently unavailable. The AI will use general knowledge.";
    }
};

module.exports = { query };
