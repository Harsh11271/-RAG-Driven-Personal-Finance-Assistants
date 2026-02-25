const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const chatRoutes = require('./routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/chat', chatRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'LLM Service' });
});

app.listen(PORT, () => {
    console.log(`LLM Service running on port ${PORT}`);
});
