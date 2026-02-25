const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const morgan = require('morgan');
require('dotenv').config();

const Document = require('./models/Document');

const app = express();
const PORT = process.env.PORT || 3003;
const UPLOAD_DIR = process.env.UPLOAD_DIR || '../../data/user-uploads';
const DB_URI = process.env.DB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_assistant';

// Ensure base upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Connect to MongoDB Atlas
mongoose.connect(DB_URI)
    .then(() => console.log('User Data Service: MongoDB Connected'))
    .catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Configure Multer — save to per-user subdirectory
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userId = req.body.userId || 'anonymous';
        const userDir = path.join(UPLOAD_DIR, userId);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.txt', '.csv', '.md', '.json', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${ext} not supported. Allowed: ${allowed.join(', ')}`));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'User Data Service' });
});

// ============================================================
// 1. Upload a document (file saved to disk + metadata to MongoDB)
// ============================================================
app.post('/api/user-data/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.body.userId || 'anonymous';

    try {
        const doc = await Document.create({
            userId,
            filename: req.file.filename,
            originalName: req.file.originalname,
            fileType: path.extname(req.file.originalname).toLowerCase(),
            fileSize: req.file.size
        });

        console.log(`File uploaded: ${req.file.filename} by User: ${userId}`);

        res.json({
            message: 'File uploaded successfully',
            document: {
                _id: doc._id,
                filename: doc.filename,
                originalName: doc.originalName,
                fileType: doc.fileType,
                fileSize: doc.fileSize,
                uploadedAt: doc.uploadedAt
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to save document metadata' });
    }
});

// ============================================================
// 2. List user's documents
// ============================================================
app.get('/api/user-data/documents', async (req, res) => {
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ error: 'userId query param required' });
    }

    try {
        const docs = await Document.find({ userId }).sort({ uploadedAt: -1 });
        res.json({ documents: docs });
    } catch (error) {
        console.error('List docs error:', error);
        res.status(500).json({ error: 'Failed to list documents' });
    }
});

// ============================================================
// 3. Delete a document (removes from disk + MongoDB)
// ============================================================
app.delete('/api/user-data/documents/:id', async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Delete file from disk
        const filePath = path.join(UPLOAD_DIR, doc.userId, doc.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
        }

        // Delete from MongoDB
        await Document.findByIdAndDelete(req.params.id);

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

// ============================================================
// 4. Personalization (Smart Training)
// ============================================================
app.post('/api/user-data/personalize', async (req, res) => {
    const { userId, goal, context } = req.body;

    if (!userId || !goal) {
        return res.status(400).json({ error: 'userId and goal are required' });
    }

    // Save goal as a text file in user's directory for RAG indexing
    try {
        const userDir = path.join(UPLOAD_DIR, userId);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        const goalContent = `Financial Goal: ${goal}\n\nContext: ${context || 'None provided'}\n\nUpdated: ${new Date().toISOString()}`;
        const goalFile = path.join(userDir, 'financial_goals.txt');
        fs.writeFileSync(goalFile, goalContent);

        console.log(`Personalization saved for User: ${userId}`);
        res.json({ message: 'AI personalization updated! Your goals are now indexed.' });
    } catch (error) {
        console.error('Personalization error:', error);
        res.status(500).json({ error: 'Failed to save personalization data' });
    }
});

app.listen(PORT, () => {
    console.log(`User Data Service running on port ${PORT}`);
    console.log(`Uploads directory: ${UPLOAD_DIR}`);
});
