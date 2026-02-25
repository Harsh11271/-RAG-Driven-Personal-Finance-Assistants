class PromptBuilder {
    /**
     * Constructs a system prompt for the financial AI.
     * @param {Array} context Chunks retrieved from RAG.
     * @param {Object} userData Optional user persona/goals.
     */
    buildFinancialPrompt(context, userData = {}) {
        const contextText = context.length > 0
            ? context.map(c => `[Source: ${c.source}] ${c.text}`).join('\n\n')
            : "No specific documents or rules found in the vault.";

        return `You are a highly skilled Financial AI Assistant. Your goal is to provide accurate, compliant, and personalized financial advice.

RETRIEVED CONTEXT FROM USER VAULT & COMPLIANCE RULES:
${contextText}

USER PROFILE & GOALS:
- Current User: ${userData.userId || 'Valued Client'}
- Key Goals/Context: ${userData.goals || 'Analyze current spending habits.'}

INSTRUCTIONS:
1. Use the "RETRIVED CONTEXT" above as your primary factual basis.
2. If context includes bank statements or personal uploads, refer to them to provide personalized insights.
3. If the user's question involves compliance or large transactions, check against the "Global Compliance" rules in the context.
4. If you don't know the answer or the context is missing, say so. Do not hallucinate financial numbers.
5. Keep your tone professional, encouraging, and clear.
`;
    }
}

module.exports = new PromptBuilder();
