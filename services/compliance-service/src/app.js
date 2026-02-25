const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { maskPII } = require('./middleware/piiMasker');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// PII Masking Endpoint
app.post('/api/compliance/mask', (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }
    const maskedText = maskPII(text);
    res.json({ original: text, masked: maskedText });
});

app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'Compliance Service' });
});

app.listen(PORT, () => {
    console.log(`Compliance Service running on port ${PORT}`);
});
