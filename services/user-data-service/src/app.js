const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;
const PATHWAY_PERSONALIZE_URL = process.env.PATHWAY_PERSONALIZE_URL || 'http://localhost:8081/v1/inputs';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '../../data/user-uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Prepend userId to filename for personalization in Pathway
        const userId = req.body.userId || 'anonymous';
        cb(null, `${userId}_${Date.now()}_${file.originalname}`);
    }
});

const upload = multer({ storage });

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'User Data Service' });
});

// 1. Endpoint for Document Uploads
app.post('/api/user-data/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`File uploaded: ${req.file.filename} by User: ${req.body.userId}`);

    res.json({
        message: 'File uploaded successfully',
        filename: req.file.filename,
        userId: req.body.userId
    });
});

// 2. Endpoint for Personalization (Smart Training)
app.post('/api/user-data/personalize', async (req, res) => {
    const { userId, goal, context } = req.body;

    if (!userId || !goal) {
        return res.status(400).json({ error: 'userId and goal are required' });
    }

    try {
        console.log(`Sending personalization data to Pathway for User: ${userId}`);
        // Forward to Pathway
        await axios.post(PATHWAY_PERSONALIZE_URL, {
            userId,
            goal,
            context: context || ""
        });

        res.json({ message: 'Personalization data sent to AI engine' });
    } catch (error) {
        console.error('Error sending to Pathway:', error.message);
        res.status(500).json({ error: 'Failed to communicate with AI engine' });
    }
});

app.listen(PORT, () => {
    console.log(`User Data Service running on port ${PORT}`);
    console.log(`Uploads directory: ${UPLOAD_DIR}`);
});
