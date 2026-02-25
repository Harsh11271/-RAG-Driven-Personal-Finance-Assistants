const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Alert Endpoint (Mocked Email)
app.post('/api/notifications/alert', (req, res) => {
    const { userId, type, message, data } = req.body;

    console.log('--- NEW NOTIFICATION ---');
    console.log(`To: ${userId || 'User'}`);
    console.log(`Type: ${type || 'Alert'}`);
    console.log(`Message: ${message}`);
    if (data) console.log('Metadata:', JSON.stringify(data, null, 2));
    console.log('-------------------------');

    // Here you would use nodemailer to actually send the email

    res.json({ success: true, message: 'Notification sent (mocked)' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'Notification Service' });
});

app.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
});
