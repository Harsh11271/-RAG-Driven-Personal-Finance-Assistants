const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
// Kafka replaced with CSV writer for local dev (see services/kafkaProducer.js)
require('dotenv').config();

const { connectProducer } = require('./services/kafkaProducer');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Connect Kafka
connectProducer();

// Routes
app.use('/api/transactions', transactionRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'Transaction Service' });
});

app.listen(PORT, () => {
    console.log(`Transaction Service running on port ${PORT}`);
});
