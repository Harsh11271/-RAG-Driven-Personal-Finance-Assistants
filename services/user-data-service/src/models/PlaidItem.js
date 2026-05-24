const mongoose = require('mongoose');

const plaidItemSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    accessToken: {
        type: String,
        required: true
    },
    itemId: {
        type: String,
        required: true,
        unique: true
    },
    institutionId: {
        type: String
    },
    institutionName: {
        type: String,
        default: 'Connected Bank'
    },
    status: {
        type: String,
        enum: ['active', 'error', 'disconnected'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastSyncedAt: {
        type: Date
    }
});

module.exports = mongoose.model('PlaidItem', plaidItemSchema);
