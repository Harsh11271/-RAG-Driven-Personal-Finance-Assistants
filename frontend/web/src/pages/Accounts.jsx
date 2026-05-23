import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { usePlaidLink } from 'react-plaid-link';
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

    // Plaid Integration States
    const [linkToken, setLinkToken] = useState(null);
    const [connectedBanks, setConnectedBanks] = useState([]);
    const [banksLoading, setBanksLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState({});
    const [showSimulator, setShowSimulator] = useState(false);
    const [simulatorStep, setSimulatorStep] = useState('select_bank'); // select_bank | login | success
    const [selectedBank, setSelectedBank] = useState('Chase Bank');
    const [simUsername, setSimUsername] = useState('user_good');
    const [simPassword, setSimPassword] = useState('pass_good');
    const [plaidError, setPlaidError] = useState('');

    // Fetch user's documents, banks & personalization on mount
    useEffect(() => {
        if (user?.username) {
            fetchDocuments();
            fetchConnectedBanks();
            fetchPersonalization();
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

    const fetchConnectedBanks = async () => {
        setBanksLoading(true);
        try {
            const res = await api.get(`/user-data/plaid/items?userId=${user.username}`);
            setConnectedBanks(res.data?.items || []);
        } catch (error) {
            console.error('Failed to fetch connected bank items:', error);
        } finally {
            setBanksLoading(false);
        }
    };

    const fetchPersonalization = async () => {
        try {
            const res = await api.get(`/user-data/personalize?userId=${user.username}`);
            if (res.data) {
                setPersonalization({
                    goal: res.data.goal || '',
                    context: res.data.context || ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch personalization:', error);
        }
    };

    // Plaid Link Hook
    const isMockToken = linkToken && linkToken.startsWith('mock-');
    const { open, ready } = usePlaidLink({
        token: isMockToken ? null : linkToken,
        onSuccess: (public_token, metadata) => {
            handlePlaidSuccess(public_token, {
                institutionName: metadata?.institution?.name || 'Sandbox Bank',
                institutionId: metadata?.institution?.institution_id || 'ins_mock'
            });
        },
        onExit: (err, metadata) => {
            if (err) {
                console.error('Plaid Link exited with error:', err);
                setPlaidError('Plaid Link failed. Please try again.');
            }
        }
    });

    // Auto-open Plaid Link if real token is loaded and ready
    useEffect(() => {
        if (linkToken && !linkToken.startsWith('mock-') && ready) {
            open();
        }
    }, [linkToken, ready]);

    const initiatePlaidConnection = async () => {
        setPlaidError('');
        try {
            const res = await api.post('/user-data/plaid/create-link-token', {
                userId: user.username
            });
            const token = res.data.link_token;
            setLinkToken(token);
            if (token.startsWith('mock-')) {
                setSimulatorStep('select_bank');
                setShowSimulator(true);
            }
        } catch (err) {
            console.error('Plaid initialization failed:', err);
            setPlaidError('Plaid connection failed. Using simulator.');
            // Fallback to simulator automatically if API gateway error
            setLinkToken(`mock-link-token-${Date.now()}`);
            setSimulatorStep('select_bank');
            setShowSimulator(true);
        }
    };

    const handlePlaidSuccess = async (publicToken, { institutionName, institutionId }) => {
        try {
            await api.post('/user-data/plaid/exchange-public-token', {
                userId: user.username,
                publicToken,
                institutionName,
                institutionId
            });
            fetchConnectedBanks();
            fetchDocuments(); // Refresh document vault (initial transactions synced)
            setShowSimulator(false);
            setLinkToken(null);
        } catch (err) {
            console.error('Failed to connect bank connection:', err);
            setPlaidError('Failed to verify bank authorization.');
        }
    };

    const handleSyncBank = async (itemId) => {
        setSyncStatus(prev => ({ ...prev, [itemId]: 'syncing' }));
        try {
            await api.post('/user-data/plaid/sync-transactions', {
                userId: user.username,
                itemId
            });
            setSyncStatus(prev => ({ ...prev, [itemId]: 'success' }));
            setTimeout(() => {
                setSyncStatus(prev => ({ ...prev, [itemId]: null }));
            }, 3000);
            fetchConnectedBanks();
            fetchDocuments();
        } catch (error) {
            console.error('Sync failed:', error);
            setSyncStatus(prev => ({ ...prev, [itemId]: 'error' }));
            setTimeout(() => {
                setSyncStatus(prev => ({ ...prev, [itemId]: null }));
            }, 4000);
        }
    };

    const handleDisconnectBank = async (itemId) => {
        if (!window.confirm('Are you sure you want to disconnect this bank account? All synced bank transactions will be deleted.')) {
            return;
        }

        try {
            await api.delete(`/user-data/plaid/items/${itemId}?userId=${user.username}`);
            fetchConnectedBanks();
            fetchDocuments();
        } catch (error) {
            console.error('Disconnect bank failed:', error);
            alert('Failed to disconnect bank: ' + (error.response?.data?.error || error.message));
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
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const fileTypeIcon = (type) => {
        const icons = { '.csv': '📊', '.txt': '📄', '.json': '📋', '.md': '📝', '.pdf': '📑' };
        return icons[type] || '📁';
    };

    return (
        <div className="page-layout">
            <Sidebar />
            <main className="page-content">
                {/* Top Bar */}
                <div className="top-bar">
                    <div>
                        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.75rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                            My Account & AI Vault
                        </h1>
                        <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
                            Manage documents and customize your personalized AI assistant.
                        </p>
                    </div>
                </div>

                {/* 3-Column Stats Grid */}
                <div className="stat-grid-3">
                    {/* Document count card */}
                    <div className="stat-card stat-blue">
                        <div className="stat-card-header">
                            <div className="stat-icon-badge badge-blue">
                                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                        <div className="stat-label">Documents</div>
                        <div className="stat-value">{documents.length}</div>
                        <div className="stat-detail">Uploaded files</div>
                    </div>

                    {/* AI Status card */}
                    <div className={`stat-card stat-${documents.length > 0 ? 'green' : 'orange'}`}>
                        <div className="stat-card-header">
                            <div className={`stat-icon-badge badge-${documents.length > 0 ? 'green' : 'orange'}`}>
                                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                        </div>
                        <div className="stat-label">AI Status</div>
                        <div className="stat-value" style={{ fontSize: '1.45rem', marginTop: '0.25rem' }}>
                            {documents.length > 0 ? '🟢 Active' : '⚪ No Data'}
                        </div>
                        <div className="stat-detail">RAG indexing</div>
                    </div>

                    {/* Allowed Formats card */}
                    <div className="stat-card stat-orange">
                        <div className="stat-card-header">
                            <div className="stat-icon-badge badge-orange">
                                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </div>
                        </div>
                        <div className="stat-label">Allowed Formats</div>
                        <div className="stat-value" style={{ fontSize: '1.1rem', marginTop: '0.6rem' }}>.csv .txt .json .md .pdf</div>
                        <div className="stat-detail">Max 10MB per file</div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="content-grid">
                    <div className="left-col">
                        {/* Document Vault card */}
                        <div className="card">
                            <div className="card-header">
                                <h2>📂 Your AI Document Vault</h2>
                            </div>
                            
                            {/* Premium Upload Form */}
                            <form onSubmit={handleUpload}>
                                <div className="file-upload-wrapper" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.01)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}
                                           onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'}
                                           onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}>
                                        <span style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📤</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#cbd5e1' }}>
                                            {file ? file.name : "Click to select a document"}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                                            Supports CSV, TXT, JSON, MD or PDF
                                        </span>
                                        <input type="file" onChange={handleFileChange} accept=".txt,.csv,.json,.md,.pdf" style={{ display: 'none' }} />
                                    </label>
                                    
                                    {file && (
                                        <button type="submit" className="upload-cta" style={{ width: '100%' }}>
                                            Upload to AI
                                        </button>
                                    )}
                                </div>
                            </form>
                            
                            {uploadStatus && (
                                <p style={{ marginTop: '12px', fontSize: '0.9rem', fontWeight: 500, color: uploadStatus.includes('❌') ? '#ff6b6b' : '#10B981' }}>
                                    {uploadStatus}
                                </p>
                            )}

                            {/* Document List */}
                            <div style={{ marginTop: '1.75rem' }}>
                                {docsLoading ? (
                                    <p style={{ color: '#64748B', textAlign: 'center', padding: '1rem' }}>Loading documents...</p>
                                ) : documents.length === 0 ? (
                                    <p style={{ color: '#64748B', textAlign: 'center', padding: '2rem 1rem', fontSize: '0.9rem' }}>
                                        No documents uploaded yet. Upload bank statements, budgets, or goals to get started!
                                    </p>
                                ) : (
                                    <div className="tx-list">
                                        {documents.map((doc) => (
                                            <div key={doc._id} className="tx-item">
                                                <div className="tx-info">
                                                    <h4>{fileTypeIcon(doc.fileType)} {doc.originalName}</h4>
                                                    <p>{formatFileSize(doc.fileSize)} • {formatDate(doc.uploadedAt)}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(doc._id)}
                                                    style={{
                                                        background: 'none',
                                                        border: '1px solid rgba(255,107,107,0.2)',
                                                        color: '#ff6b6b',
                                                        borderRadius: '8px',
                                                        padding: '6px 14px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.1)'; e.currentTarget.style.borderColor = '#ff6b6b'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(255,107,107,0.2)'; }}
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

                    <div className="right-col" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Bank Connection */}
                        <div className="card">
                            <div className="card-header">
                                <h2>🏦 Bank Connection</h2>
                            </div>
                            <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: '1.6', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
                                Link your bank account for real-time transaction streaming & RAG analytics.
                            </p>

                            {plaidError && (
                                <p style={{ fontSize: '0.85rem', color: '#ff6b6b', margin: '-0.75rem 0 1rem 0', fontWeight: 500 }}>
                                    ⚠️ {plaidError}
                                </p>
                            )}

                            {/* Connected Accounts List */}
                            {banksLoading ? (
                                <p style={{ color: '#64748B', fontSize: '0.85rem', padding: '0.5rem 0' }}>Checking linked banks...</p>
                            ) : connectedBanks.length === 0 ? (
                                <button className="upload-cta" style={{ width: '100%' }} onClick={initiatePlaidConnection}>
                                    ⚡ Connect Bank Feed
                                </button>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                                    {connectedBanks.map((bank) => (
                                        <div key={bank.itemId} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.85rem', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)', borderRadius: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.9rem' }}>🏦 {bank.institutionName}</span>
                                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: '#10B981', fontWeight: 600 }}>Active</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748B' }}>
                                                <span>Last Synced: {formatDate(bank.lastSyncedAt)}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '0.25rem' }}>
                                                <button 
                                                    className="upload-cta" 
                                                    style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem', height: '32px' }}
                                                    onClick={() => handleSyncBank(bank.itemId)}
                                                    disabled={syncStatus[bank.itemId] === 'syncing'}
                                                >
                                                    {syncStatus[bank.itemId] === 'syncing' ? '🔄 Syncing...' : 
                                                     syncStatus[bank.itemId] === 'success' ? '✅ Synced!' : 
                                                     syncStatus[bank.itemId] === 'error' ? '❌ Failed' : 'Sync Feed'}
                                                </button>
                                                <button 
                                                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#94A3B8', fontSize: '0.8rem', padding: '0 10px', cursor: 'pointer', height: '32px', transition: 'all 0.2s' }}
                                                    onClick={() => handleDisconnectBank(bank.itemId)}
                                                    onMouseEnter={e => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.borderColor = '#ff6b6b'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                                                >
                                                    Disconnect
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button 
                                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px', color: '#3B82F6', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onClick={initiatePlaidConnection}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.05)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    >
                                        ➕ Connect Another Bank
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* AI Personalization */}
                        <div className="card">
                            <div className="card-header">
                                <h2>🧠 AI Smart Training</h2>
                            </div>
                            <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
                                Tell the AI about your financial goals for personalized advice.
                            </p>
                            <form onSubmit={handlePersonalizationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <label style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Goal Description</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., Save $10k for a house, Retire at 50..."
                                        value={personalization.goal}
                                        onChange={(e) => setPersonalization({ ...personalization, goal: e.target.value })}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <label style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Context & Preferences</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Additional context (family, risk preference, income...)"
                                        value={personalization.context}
                                        onChange={(e) => setPersonalization({ ...personalization, context: e.target.value })}
                                    />
                                </div>
                                <button type="submit" className="upload-cta" style={{ width: '100%' }}>
                                    Update AI Brain
                                </button>
                            </form>
                            {trainStatus && (
                                <p style={{ marginTop: '12px', fontSize: '0.9rem', fontWeight: 500, color: trainStatus.includes('❌') ? '#ff6b6b' : '#10B981' }}>
                                    {trainStatus}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Custom Plaid Link Simulator Modal */}
            {showSimulator && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', width: '380px', padding: '1.75rem', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.15rem' }}>⚡</span>
                                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff', fontFamily: "'Outfit', sans-serif" }}>Plaid Link Simulator</span>
                            </div>
                            <button 
                                style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '1.25rem', cursor: 'pointer', padding: 0 }}
                                onClick={() => { setShowSimulator(false); setLinkToken(null); }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Step 1: Select Bank */}
                        {simulatorStep === 'select_bank' && (
                            <div>
                                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1rem' }}>Select a mock banking institution to connect:</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {['Chase Bank', 'Bank of America', 'Wells Fargo', 'Citibank', 'Capital One'].map((bank) => (
                                        <button 
                                            key={bank}
                                            style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', color: '#ffffff', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                                            onClick={() => {
                                                setSelectedBank(bank);
                                                setSimulatorStep('login');
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                                        >
                                            🏦 {bank}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Login */}
                        {simulatorStep === 'login' && (
                            <div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#3B82F6', fontWeight: 700, textTransform: 'uppercase' }}>Connecting to</span>
                                    <h4 style={{ margin: '0.1rem 0 0 0', color: '#ffffff', fontSize: '1rem' }}>🏦 {selectedBank}</h4>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#64748B', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)', padding: '8px 12px', borderRadius: '8px', lineHeight: '1.4', marginBottom: '1rem' }}>
                                    💡 Sandbox Mode: Enter any mock credentials (e.g. <b>user_good</b> / <b>pass_good</b>) to authorize connection.
                                </p>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    setSimulatorStep('success');
                                    // Trigger exchange public token
                                    setTimeout(() => {
                                        handlePlaidSuccess(`mock-public-token-${Date.now()}`, {
                                            institutionName: selectedBank,
                                            institutionId: `ins_${selectedBank.toLowerCase().replace(/ /g, '_')}`
                                        });
                                    }, 1500);
                                }} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <label style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Username</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={simUsername} 
                                            onChange={e => setSimUsername(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <label style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Password</label>
                                        <input 
                                            type="password" 
                                            className="form-input" 
                                            value={simPassword} 
                                            onChange={e => setSimPassword(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <button type="submit" className="upload-cta" style={{ width: '100%', marginTop: '0.5rem' }}>
                                        Sign In & Authorize Link
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Step 3: Success */}
                        {simulatorStep === 'success' && (
                            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
                                <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem' }}>Success!</h3>
                                <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.5rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                                    Your account at <b>{selectedBank}</b> has been linked. Retrieving and indexing transactions...
                                </p>
                                <div className="loading-spinner" style={{ margin: '0 auto', width: '28px', height: '28px', borderWidth: '2px' }}></div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountPage;
