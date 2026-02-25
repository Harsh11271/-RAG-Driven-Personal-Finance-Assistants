const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { sendTransaction } = require('../services/kafkaProducer');

const UPLOAD_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../../../data/user-uploads');
const csvPath = path.join(UPLOAD_DIR, 'inbound_transactions.csv');

// Helper: read CSV and return array of transaction objects
function readTransactions() {
    return new Promise((resolve, reject) => {
        const results = [];
        if (!fs.existsSync(csvPath)) {
            return resolve([]);
        }
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => results.push(row))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

// @desc    List all transactions
// @route   GET /api/transactions
router.get('/', async (req, res) => {
    try {
        const transactions = await readTransactions();
        // Sort newest first
        transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json({ data: transactions });
    } catch (error) {
        console.error('Error reading transactions:', error);
        res.status(500).json({ message: 'Failed to read transactions' });
    }
});

// @desc    Get transaction stats (for dashboard)
// @route   GET /api/transactions/stats
router.get('/stats', async (req, res) => {
    try {
        const transactions = await readTransactions();
        const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0);
        const count = transactions.length;

        // Top category
        const catCounts = {};
        transactions.forEach(t => {
            const cat = t.category || 'Uncategorized';
            catCounts[cat] = (catCounts[cat] || 0) + 1;
        });
        const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        // This month spending
        const now = new Date();
        const thisMonth = transactions.filter(t => {
            const d = new Date(t.timestamp);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const monthlySpending = thisMonth.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0);

        res.json({
            totalSpent: totalSpent.toFixed(2),
            transactionCount: count,
            topCategory,
            monthlySpending: monthlySpending.toFixed(2)
        });
    } catch (error) {
        console.error('Error computing stats:', error);
        res.status(500).json({ message: 'Failed to compute stats' });
    }
});

// @desc    Create a new transaction (Simulation)
// @route   POST /api/transactions
// @access  Public (for simulation) - logic should secure this later
router.post('/', async (req, res) => {
    try {
        const { userId, amount, currency, merchant, category, status } = req.body;

        if (!amount || !merchant) {
            return res.status(400).json({ message: 'Amount and Merchant are required' });
        }

        const transaction = {
            transaction_id: `txn_${Math.floor(Math.random() * 100000)}`,
            amount,
            category: category || 'Uncategorized',
            description: merchant, // Pathway expects description
            timestamp: new Date().toISOString()
        };

        // Send to Kafka
        await sendTransaction(transaction);

        res.status(201).json({
            message: 'Transaction received and queued',
            data: transaction
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
