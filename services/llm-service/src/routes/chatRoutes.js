const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pathwayService = require('../services/pathwayService');
const llmClient = require('../services/llmClient');

// Load global compliance rules (run once on startup)
const KNOWLEDGE_BASE_DIR = '/app/data/knowledge-base/documents';
let globalComplianceRules = '';

try {
    const amlPath = path.join(KNOWLEDGE_BASE_DIR, 'aml_policies.md');
    if (fs.existsSync(amlPath)) {
        globalComplianceRules += fs.readFileSync(amlPath, 'utf8') + '\n\n';
    }
    const faqPath = path.join(KNOWLEDGE_BASE_DIR, 'faq.json');
    if (fs.existsSync(faqPath)) {
        const faqs = JSON.parse(fs.readFileSync(faqPath, 'utf8'));
        globalComplianceRules += '## Standard FAQs\n' + faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n') + '\n\n';
    }
} catch (err) {
    console.error('Failed to load global compliance rules:', err);
}

console.log("Global compliance rules loaded, length:", globalComplianceRules.length);

router.post('/message', async (req, res) => {
    try {
        const { message, history, userId } = req.body;
        console.log(`LLM Service Received (${process.env.LLM_PROVIDER || 'gemini'}) from ${userId || 'unknown'}:`, message);

        // 1. Fetch Context from Pathway RAG (filtered by userId if provided)
        let contextArray = await pathwayService.query(message, userId);

        // Ensure it's an array
        if (!Array.isArray(contextArray)) {
            contextArray = [];
        }

        // 2. Prepend Global Compliance Rules to the context
        if (globalComplianceRules) {
            contextArray.unshift({
                source: 'Global Compliance Rules',
                text: globalComplianceRules
            });
        }

        // 3. Generate Answer with Context
        const answer = await llmClient.generateAnswer(message, contextArray, history);

        res.json({ answer, context: contextArray });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================================
// Dashboard Data Cache
// ==========================================================
const dashboardCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ==========================================================
// Dashboard Data — AI extracts structured metrics from user docs
// ==========================================================
router.post('/dashboard-data', async (req, res) => {
    try {
        const { userId, forceRefresh } = req.body;
        console.log(`Dashboard data request for user: ${userId || 'unknown'} (forceRefresh=${forceRefresh})`);

        // Check Cache
        if (!forceRefresh) {
            const cached = dashboardCache.get(userId);
            if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
                console.log(`Returning cached dashboard data for ${userId}`);
                return res.json(cached.data);
            }
        }

        // Query RAG with a broad financial query to get ALL user documents
        const broadQueries = [
            'bank statement transactions spending budget savings investment goals',
            'monthly budget financial plan income expenses categories',
        ];

        // Parallelize RAG queries to save time
        const resultsArray = await Promise.all(broadQueries.map(q => pathwayService.query(q, userId, 8)));

        let allContext = [];
        resultsArray.forEach(results => {
            if (Array.isArray(results)) {
                allContext = allContext.concat(results);
            }
        });

        // Deduplicate by text content
        const seen = new Set();
        allContext = allContext.filter(item => {
            const key = (item.text || '').substring(0, 100);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        console.log(`Dashboard RAG: found ${allContext.length} document chunks for ${userId}`);

        // If no documents found, return empty defaults
        if (allContext.length === 0) {
            const emptyData = {
                hasData: false,
                totalSpend: 0,
                budgetRemaining: 0,
                savingsThisMonth: 0,
                alertCount: 0,
                transactions: [],
                categories: [],
                insight: 'Upload your bank statements, budgets, and financial documents to see your personalized dashboard.',
                goals: [],
            };
            return res.json(emptyData);
        }

        // Build context string from RAG results
        const contextStr = allContext.map(c => `[${c.source || 'document'}]: ${c.text}`).join('\n\n');

        // Ask AI to extract structured dashboard data
        const dashboardPrompt = `You are a financial data extraction AI. Analyze the following user documents and extract structured financial data.

USER DOCUMENTS:
${contextStr}

TASK: Extract and return a JSON object with these fields. Use ONLY data found in the documents above. If a field cannot be determined, use 0 or empty array. Do NOT make up numbers.

Required JSON format (return ONLY valid JSON, no markdown, no backticks):
{
  "totalSpend": <number: total spending amount found in documents>,
  "monthlyIncome": <number: monthly income if mentioned>,
  "budgetRemaining": <number: budget minus spending, or 0>,
  "savingsThisMonth": <number: savings amount or income minus spending>,
  "alertCount": <number: count of suspicious or large transactions over 5000>,
  "transactions": [<up to 8 recent transactions as {"description": "...", "category": "...", "amount": <number>, "date": "...", "status": "completed"}>],
  "categories": [<spending by category as {"name": "...", "amount": <number>, "percentage": <number>}>],
  "insight": "<one paragraph financial insight based on the data>",
  "goals": [<financial goals mentioned as strings>],
  "investmentTotal": <number: total investments if mentioned>,
  "debtTotal": <number: total debts/loans if mentioned>
}`;

        const answer = await llmClient.generateAnswer(dashboardPrompt, [], []);

        // Try to parse the JSON from the AI response
        let dashboardData;
        try {
            // Clean the response — strip markdown code blocks if present
            let cleaned = answer.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            dashboardData = JSON.parse(cleaned);
            dashboardData.hasData = true;
        } catch (parseErr) {
            console.error('Failed to parse AI dashboard JSON:', parseErr.message);
            console.log('Raw AI response:', answer.substring(0, 500));
            // Return the raw insight if JSON parsing fails
            dashboardData = {
                hasData: true,
                totalSpend: 0,
                budgetRemaining: 0,
                savingsThisMonth: 0,
                alertCount: 0,
                transactions: [],
                categories: [],
                insight: answer,
                goals: [],
            };
        }

        // Save to cache before returning
        dashboardCache.set(userId, { timestamp: Date.now(), data: dashboardData });

        res.json(dashboardData);
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

