const express = require('express');
const router = express.Router();
const { sendTransaction } = require('../services/kafkaProducer');

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
