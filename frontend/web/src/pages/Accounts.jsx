import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import './Dashboard.css';

const AccountPage = () => {
    const { user } = useAuth();
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [documents, setDocuments] = useState([]);
    const [docsLoading, setDocsLoading] = useState(true);
    const [personalization, setPersonalization] = useState({
        goal: '',
        context: ''
    });
    const [trainStatus, setTrainStatus] = useState('');

    // Fetch user's documents on mount
    useEffect(() => {
        if (user?.username) {
            fetchDocuments();
        }
    }, [user]);

    const fetchDocuments = async () => {
        try {
            const res = await api.get(`/user-data/documents?userId=${user.username}`);
            setDocuments(res.data?.documents || []);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            setDocsLoading(false);
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('userId', user.username);
        formData.append('file', file);

        setUploadStatus('Uploading...');
        try {
            await api.post('/user-data/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadStatus('✅ Document uploaded & queued for AI indexing!');
            setFile(null);
            // Reset file input
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) fileInput.value = '';
            // Refresh document list
            fetchDocuments();
        } catch (error) {
            setUploadStatus('❌ Upload failed: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (docId) => {
        if (!window.confirm('Delete this document? It will also be removed from AI knowledge.')) return;

        try {
            await api.delete(`/user-data/documents/${docId}`);
            setDocuments(docs => docs.filter(d => d._id !== docId));
        } catch (error) {
            alert('Failed to delete: ' + (error.response?.data?.error || error.message));
        }
    };

    const handlePersonalizationSubmit = async (e) => {
        e.preventDefault();
        setTrainStatus('Saving goals...');
        try {
            await api.post('/user-data/personalize', {
                userId: user.username,
                ...personalization
            });
            setTrainStatus('✅ AI personalization updated! Your goals are now indexed.');
        } catch (error) {
            setTrainStatus('❌ Failed: ' + (error.response?.data?.error || error.message));
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '—';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const fileTypeIcon = (type) => {
        const icons = { '.csv': '📊', '.txt': '📄', '.json': '📋', '.md': '📝', '.pdf': '📑' };
        return icons[type] || '📁';
    };

    return (
        <div className="dashboard-container">
            <Sidebar />
            <main className="dashboard-content">
                <header className="dashboard-header">
                    <h1>My Account & AI Vault</h1>
                    <p className="welcome-text">Upload documents to train your personal AI assistant.</p>
                </header>

                <div className="dashboard-stats">
                    <div className="stat-card">
                        <h3>Documents</h3>
                        <div className="value">{documents.length}</div>
                        <div className="trend">Uploaded files</div>
                    </div>
                    <div className="stat-card">
                        <h3>AI Status</h3>
                        <div className="value" style={{ fontSize: '1.4rem' }}>
                            {documents.length > 0 ? '🟢 Active' : '⚪ No Data'}
                        </div>
                        <div className="trend">RAG indexing</div>
                    </div>
                    <div className="stat-card">
                        <h3>Allowed Formats</h3>
                        <div className="value" style={{ fontSize: '1.1rem' }}>.csv .txt .json .md</div>
                        <div className="trend">Max 10MB per file</div>
                    </div>
                </div>

                <div className="dashboard-main">
                    <div className="main-left">
                        {/* Document Vault */}
                        <div className="card">
                            <h2>📂 Your AI Document Vault</h2>

                            {/* Upload Form */}
                            <form onSubmit={handleUpload} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
                                <input type="file" onChange={handleFileChange} accept=".txt,.csv,.json,.md,.pdf"
                                    style={{ flex: 1, minWidth: '200px' }} />
                                <button type="submit" className="ask-ai-btn" style={{ margin: 0 }}>
                                    Upload to AI
                                </button>
                            </form>
                            {uploadStatus && (
                                <p style={{ marginTop: '8px', fontSize: '0.9rem', color: uploadStatus.includes('❌') ? '#ff6b6b' : '#4CAF50' }}>
                                    {uploadStatus}
                                </p>
                            )}

                            {/* Document List */}
                            <div style={{ marginTop: '1.5rem' }}>
                                {docsLoading ? (
                                    <p style={{ color: '#888' }}>Loading documents...</p>
                                ) : documents.length === 0 ? (
                                    <p style={{ color: '#888' }}>No documents uploaded yet. Upload bank statements, budgets, or goals to get started!</p>
                                ) : (
                                    <div className="tx-list">
                                        {documents.map((doc) => (
                                            <div key={doc._id} className="tx-item" style={{ alignItems: 'center' }}>
                                                <div className="tx-info">
                                                    <h4>{fileTypeIcon(doc.fileType)} {doc.originalName}</h4>
                                                    <p>{formatFileSize(doc.fileSize)} • {formatDate(doc.uploadedAt)}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(doc._id)}
                                                    style={{
                                                        background: 'none',
                                                        border: '1px solid rgba(255,107,107,0.4)',
                                                        color: '#ff6b6b',
                                                        borderRadius: '8px',
                                                        padding: '6px 14px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={e => { e.target.style.background = 'rgba(255,107,107,0.15)'; }}
                                                    onMouseLeave={e => { e.target.style.background = 'none'; }}
                                                >
                                                    🗑 Delete
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="main-right">
                        {/* Bank Connection */}
                        <div className="card profile-summary">
                            <h2>🏦 Bank Connection</h2>
                            <div className="profile-details">
                                <p>Link your bank account for real-time transaction analysis.</p>
                                <button className="ask-ai-btn" style={{ opacity: 0.6, cursor: 'not-allowed', marginTop: '0.5rem' }}>
                                    Connect with Plaid (Coming Soon)
                                </button>
                            </div>
                        </div>

                        {/* AI Personalization */}
                        <div className="ai-brief">
                            <h2>🧠 AI Smart Training</h2>
                            <p style={{ marginBottom: '0.8rem', fontSize: '0.9rem', opacity: 0.8 }}>
                                Tell the AI about your financial goals for personalized advice.
                            </p>
                            <form onSubmit={handlePersonalizationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="e.g., Save $10k for a house, Retire at 50..."
                                    value={personalization.goal}
                                    onChange={(e) => setPersonalization({ ...personalization, goal: e.target.value })}
                                    style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: '0.95rem' }}
                                />
                                <textarea
                                    placeholder="Additional context (family, risk preference, income...)"
                                    value={personalization.context}
                                    onChange={(e) => setPersonalization({ ...personalization, context: e.target.value })}
                                    style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'inherit', minHeight: '70px', fontSize: '0.95rem', resize: 'vertical' }}
                                />
                                <button type="submit" className="ask-ai-btn" style={{ margin: 0 }}>
                                    Update AI Brain
                                </button>
                            </form>
                            {trainStatus && (
                                <p style={{ marginTop: '8px', fontSize: '0.9rem', color: trainStatus.includes('❌') ? '#ff6b6b' : '#4CAF50' }}>
                                    {trainStatus}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AccountPage;
