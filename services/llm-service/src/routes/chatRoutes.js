const express = require('express');
const router = express.Router();
const pathwayService = require('../services/pathwayService');
const llmClient = require('../services/llmClient');

router.post('/message', async (req, res) => {
    try {
        const { message, history } = req.body;
        console.log(`LLM Service Received (${process.env.LLM_PROVIDER || 'gemini'}):`, message);

        // 1. Fetch Context from Pathway RAG
        const context = await pathwayService.query(message);

        // 2. Generate Answer with Context
        const answer = await llmClient.generateAnswer(message, context, history);

        res.json({ answer, context });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
