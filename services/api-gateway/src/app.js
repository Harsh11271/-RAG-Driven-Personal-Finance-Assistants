const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:3002';
const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://localhost:5000';
const USER_DATA_SERVICE_URL = process.env.USER_DATA_SERVICE_URL || 'http://localhost:3003';
const TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL || 'http://localhost:3004';
const COMPLIANCE_SERVICE_URL = process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:3005';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006';

app.use(cors());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'API Gateway' });
});

// ---- Proxy Rules ----

// Auth Service
app.use('/api/auth', createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
}));

// User Data Service (Uploads & Personalization)
app.use('/api/user-data', createProxyMiddleware({
    target: USER_DATA_SERVICE_URL,
    changeOrigin: true,
}));

// LLM Service for AI Chat
app.use('/api/chat', createProxyMiddleware({
    target: LLM_SERVICE_URL,
    changeOrigin: true,
}));

// Transaction Service
app.use('/api/transactions', createProxyMiddleware({
    target: TRANSACTION_SERVICE_URL,
    changeOrigin: true,
}));

// Compliance Service
app.use('/api/compliance', createProxyMiddleware({
    target: COMPLIANCE_SERVICE_URL,
    changeOrigin: true,
}));

// Notification Service
app.use('/api/notifications', createProxyMiddleware({
    target: NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
}));

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log(`Proxying Auth     -> ${AUTH_SERVICE_URL}`);
    console.log(`Proxying Chat/LLM -> ${LLM_SERVICE_URL}`);
    console.log(`Proxying UserData -> ${USER_DATA_SERVICE_URL}`);
    console.log(`Proxying Txn      -> ${TRANSACTION_SERVICE_URL}`);
    console.log(`Proxying Comply   -> ${COMPLIANCE_SERVICE_URL}`);
    console.log(`Proxying Notify   -> ${NOTIFICATION_SERVICE_URL}`);
});
