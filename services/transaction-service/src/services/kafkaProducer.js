const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Path to the inbound transactions CSV (must match Pathway's input)
const UPLOAD_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../../../data/user-uploads');
const csvPath = path.join(UPLOAD_DIR, 'inbound_transactions.csv');

// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Ensure file has headers if it's new
if (!fs.existsSync(csvPath)) {
    fs.writeFileSync(csvPath, 'transaction_id,amount,category,description,timestamp\n');
}

const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
        { id: 'transaction_id', title: 'transaction_id' },
        { id: 'amount', title: 'amount' },
        { id: 'category', title: 'category' },
        { id: 'description', title: 'description' },
        { id: 'timestamp', title: 'timestamp' },
    ],
    append: true
});

const connectProducer = async () => {
    console.log('CSV Writer Initialized (Replacing Kafka)');
    return Promise.resolve();
};

const sendTransaction = async (transaction) => {
    try {
        await csvWriter.writeRecords([transaction]);
        console.log('Transaction saved to CSV:', transaction.transaction_id);
    } catch (error) {
        console.error('Error saving transaction to CSV:', error);
    }
};

module.exports = { connectProducer, sendTransaction };
