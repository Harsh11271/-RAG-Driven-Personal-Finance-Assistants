const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const PlaidItem = require('../models/PlaidItem');
const Document = require('../models/Document');

const UPLOAD_DIR = process.env.UPLOAD_DIR || '../../data/user-uploads';
const CLIENT_ID = process.env.PLAID_CLIENT_ID;
const SECRET = process.env.PLAID_SECRET;
const ENV = process.env.PLAID_ENV || 'sandbox';

// Determine if we are in simulator mode
const isSimulator = !CLIENT_ID || !SECRET || CLIENT_ID.includes('placeholder') || CLIENT_ID === 'your_plaid_client_id';

let plaidClient = null;
if (!isSimulator) {
    try {
        const configuration = new Configuration({
            basePath: PlaidEnvironments[ENV],
            baseOptions: {
                headers: {
                    'PLAID-CLIENT-ID': CLIENT_ID,
                    'PLAID-SECRET': SECRET,
                },
            },
        });
        plaidClient = new PlaidApi(configuration);
        console.log(`[Plaid] Initialized on environment: ${ENV}`);
    } catch (err) {
        console.error('[Plaid] Failed to initialize official SDK, falling back to simulator:', err.message);
    }
} else {
    console.log('[Plaid] Starting in SIMULATOR Mode (no Client ID or Secret found).');
}

// 1. Create Link Token
router.post('/create-link-token', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    if (isSimulator || !plaidClient) {
        console.log(`[Plaid Link] Simulator creating link token for User: ${userId}`);
        return res.json({ link_token: `mock-link-token-${Date.now()}` });
    }

    try {
        const request = {
            user: { client_user_id: userId },
            client_name: 'Fintech AI Assistant',
            products: ['transactions'],
            country_codes: ['US'],
            language: 'en',
        };
        const response = await plaidClient.linkTokenCreate(request);
        res.json({ link_token: response.data.link_token });
    } catch (error) {
        console.error('[Plaid Link Create Error]:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to create Plaid Link token' });
    }
});

// 2. Exchange Public Token
router.post('/exchange-public-token', async (req, res) => {
    const { userId, publicToken, institutionName, institutionId } = req.body;
    if (!userId || !publicToken) {
        return res.status(400).json({ error: 'userId and publicToken are required' });
    }

    const bankName = institutionName || 'Mock Sandbox Bank';
    const bankId = institutionId || 'ins_mock';

    if (isSimulator || !plaidClient) {
        console.log(`[Plaid Exchange] Simulator exchanging token for User: ${userId}`);
        const mockItemId = `item_mock_${Math.random().toString(36).substr(2, 9)}`;
        const mockAccessToken = `access_mock_${Math.random().toString(36).substr(2, 15)}`;

        try {
            const newItem = await PlaidItem.create({
                userId,
                accessToken: mockAccessToken,
                itemId: mockItemId,
                institutionId: bankId,
                institutionName: bankName,
                status: 'active',
            });

            // Perform initial simulation sync
            await performSync(userId, newItem);

            return res.json({
                message: 'Bank connected successfully (SIMULATOR)',
                item: {
                    itemId: newItem.itemId,
                    institutionName: newItem.institutionName,
                }
            });
        } catch (error) {
            console.error('[Plaid Simulator Exchange DB Error]:', error);
            return res.status(500).json({ error: 'Failed to save connected bank item' });
        }
    }

    try {
        const response = await plaidClient.itemPublicTokenExchange({
            public_token: publicToken,
        });

        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        const newItem = await PlaidItem.create({
            userId,
            accessToken,
            itemId,
            institutionId: bankId,
            institutionName: bankName,
            status: 'active',
        });

        // Trigger sync
        await performSync(userId, newItem);

        res.json({
            message: 'Bank connected successfully',
            item: {
                itemId: newItem.itemId,
                institutionName: newItem.institutionName,
            }
        });
    } catch (error) {
        console.error('[Plaid Exchange Token Error]:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to exchange public token' });
    }
});

// 3. Sync Transactions
router.post('/sync-transactions', async (req, res) => {
    const { userId, itemId } = req.body;
    if (!userId || !itemId) {
        return res.status(400).json({ error: 'userId and itemId are required' });
    }

    try {
        const item = await PlaidItem.findOne({ userId, itemId });
        if (!item) {
            return res.status(404).json({ error: 'Linked bank account not found' });
        }

        await performSync(userId, item);

        res.json({
            message: 'Transactions synced successfully!',
            item: {
                itemId: item.itemId,
                institutionName: item.institutionName,
                lastSyncedAt: item.lastSyncedAt
            }
        });
    } catch (error) {
        console.error('[Plaid Sync Router Error]:', error);
        res.status(500).json({ error: 'Failed to sync bank transactions: ' + error.message });
    }
});

// 4. Get Connected Banks
router.get('/items', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'userId parameter is required' });
    }

    try {
        const items = await PlaidItem.find({ userId }).select('-accessToken');
        res.json({ items });
    } catch (error) {
        console.error('[Plaid Get Items Error]:', error);
        res.status(500).json({ error: 'Failed to fetch connected accounts' });
    }
});

// 5. Disconnect Bank
router.delete('/items/:itemId', async (req, res) => {
    const itemId = req.params.itemId;
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ error: 'userId query parameter required' });
    }

    try {
        const item = await PlaidItem.findOne({ itemId, userId });
        if (!item) {
            return res.status(404).json({ error: 'Bank connection not found' });
        }

        // Delete Plaid token from DB
        await PlaidItem.deleteOne({ itemId, userId });

        // Delete synced transaction file from disk if it exists
        const userDir = path.join(UPLOAD_DIR, userId);
        const filename = `plaid_transactions_${itemId}.csv`;
        const filePath = path.join(userDir, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete Document metadata from MongoDB
        await Document.deleteOne({ userId, filename });

        res.json({ message: 'Bank account disconnected successfully and all synced data removed.' });
    } catch (error) {
        console.error('[Plaid Disconnect Bank Error]:', error);
        res.status(500).json({ error: 'Failed to disconnect bank account' });
    }
});

// Helper Function: Perform Sync (Simulated or Real Plaid API)
async function performSync(userId, item) {
    let transactions = [];

    if (isSimulator || !plaidClient) {
        console.log(`[Plaid Sync] Generating simulated transactions for item: ${item.itemId}`);
        transactions = generateSimulatedTransactions(userId);
    } else {
        console.log(`[Plaid Sync] Fetching real Plaid API transactions for item: ${item.itemId}`);
        try {
            // Fetch transactions for the past 30 days
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const endDate = new Date();

            const formatDate = (d) => d.toISOString().split('T')[0];

            const response = await plaidClient.transactionsGet({
                access_token: item.accessToken,
                start_date: formatDate(startDate),
                end_date: formatDate(endDate),
                options: { count: 100 }
            });

            transactions = response.data.transactions.map(t => ({
                userId,
                transaction_id: t.transaction_id,
                amount: t.amount,
                currency: t.iso_currency_code || 'USD',
                merchant: t.merchant_name || t.name,
                category: t.category ? t.category[0] : 'General',
                date: t.date,
                status: 'completed'
            }));
        } catch (apiError) {
            console.error('[Plaid Sync API Error]:', apiError.response ? apiError.response.data : apiError.message);
            throw new Error('Failed to retrieve transactions from Plaid API: ' + apiError.message);
        }
    }

    // Convert transactions to CSV and write to disk
    const userDir = path.join(UPLOAD_DIR, userId);
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }

    const filename = `plaid_transactions_${item.itemId}.csv`;
    const filePath = path.join(userDir, filename);

    // CSV header and content conversion
    const csvHeader = 'transaction_id,userId,date,description,amount,category,status\n';
    const csvRows = transactions.map(t => {
        // Escape quotes and clean descriptions
        const desc = (t.merchant || 'Transaction').replace(/"/g, '""');
        return `"${t.transaction_id}","${userId}","${t.date}","${desc}",${t.amount},"${t.category}","${t.status}"`;
    }).join('\n');

    fs.writeFileSync(filePath, csvHeader + csvRows);

    // Register / update Document metadata in MongoDB
    await Document.findOneAndUpdate(
        { userId, filename },
        {
            userId,
            filename,
            originalName: `🏦 Live Bank Sync: ${item.institutionName}`,
            fileType: '.csv',
            fileSize: fs.statSync(filePath).size,
            uploadedAt: new Date()
        },
        { upsert: true, new: true }
    );

    // Update lastSyncedAt timestamp on PlaidItem
    item.lastSyncedAt = new Date();
    await item.save();

    console.log(`[Plaid Sync Complete] Synced ${transactions.length} records. Saved to ${filePath}`);
}

// Generate high-quality mock financial transactions
function generateSimulatedTransactions(userId) {
    const categories = ['Groceries', 'Food & Drink', 'Travel', 'Entertainment', 'Bills', 'Income'];
    const merchants = {
        'Groceries': ['Whole Foods Market', 'Kroger', 'Safeway', 'Trader Joe\'s'],
        'Food & Drink': ['Starbucks Coffee', 'McDonald\'s', 'Sweetgreen', 'Chipotle Grill'],
        'Travel': ['Uber Trip', 'Lyft Ride', 'Chevron Gas Station', 'Shell Station'],
        'Entertainment': ['Netflix.com', 'Spotify Premium', 'AMC Theatres', 'Steam Games'],
        'Bills': ['Comcast Xfinity', 'PG&E Utility', 'Geico Insurance', 'Verizon Wireless'],
        'Income': ['Direct Deposit Paycheck', 'Venmo Cashout Transfer', 'Dividend Payment']
    };

    const mockTxns = [];
    const now = new Date();

    // Generate 15 mock transactions spread over the last 15 days
    for (let i = 0; i < 15; i++) {
        const date = new Date();
        date.setDate(now.getDate() - i);

        // Pick random category
        const catIndex = Math.floor(Math.random() * categories.length);
        const category = categories[catIndex];

        // Pick random merchant in that category
        const merchantList = merchants[category];
        const merchant = merchantList[Math.floor(Math.random() * merchantList.length)];

        // Income amounts are positive, expenditures are negative
        let amount = 0;
        if (category === 'Income') {
            amount = merchant.includes('Paycheck') 
                ? (1500 + Math.random() * 1000).toFixed(2)
                : (50 + Math.random() * 200).toFixed(2);
        } else {
            amount = -(5 + Math.random() * 80).toFixed(2);
        }

        mockTxns.push({
            transaction_id: `mock_tx_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
            userId,
            date: date.toISOString().split('T')[0],
            merchant,
            amount,
            category,
            status: 'completed'
        });
    }

    return mockTxns;
}

module.exports = router;
