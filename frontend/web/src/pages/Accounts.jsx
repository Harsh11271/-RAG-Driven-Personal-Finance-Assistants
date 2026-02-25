import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import './Dashboard.css'; // Reuse some basic layout

const AccountPage = () => {
    const { user } = useAuth();
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [personalization, setPersonalization] = useState({
        goal: '',
        context: ''
    });
    const [trainStatus, setTrainStatus] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', user.username);

        setUploadStatus('Uploading...');
        try {
            const response = await api.post('/user-data/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadStatus('Success! Document added to your AI Vault.');
            setFile(null);
        } catch (error) {
            setUploadStatus('Upload failed: ' + (error.response?.data?.error || error.message));
        }
    };

    const handlePersonalizationSubmit = async (e) => {
        e.preventDefault();
        setTrainStatus('Training AI...');
        try {
            await api.post('/user-data/personalize', {
                userId: user.username,
                ...personalization
            });
            setTrainStatus('AI logic updated with your goals!');
        } catch (error) {
            setTrainStatus('Training failed: ' + (error.response?.data?.error || error.message));
        }
    };

    return (
        <div className="dashboard-container">
            <Sidebar />
            <main className="dashboard-content">
                <header className="dashboard-header">
                    <h1>My Account & AI Personalization</h1>
                    <p>Connect your bank and feed your AI with documents for smarter insights.</p>
                </header>

                <div className="dashboard-grid">
                    {/* Bank Connection Card */}
                    <div className="dashboard-card">
                        <h3>🏦 Bank Connection</h3>
                        <p>Link your bank account for real-time transaction analysis.</p>
                        <button className="secondary-btn" style={{ marginTop: '1rem' }}>
                            Connect with Plaid (Coming Soon)
                        </button>
                    </div>

                    {/* Document Vault Card */}
                    <div className="dashboard-card">
                        <h3>📂 AI Document Vault</h3>
                        <p>Upload bank statements or tax returns to get personalized advice.</p>
                        <form onSubmit={handleUpload} style={{ marginTop: '1rem' }}>
                            <input type="file" onChange={handleFileChange} />
                            <button type="submit" className="primary-btn" style={{ marginTop: '0.5rem' }}>
                                Upload to AI
                            </button>
                        </form>
                        {uploadStatus && <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#4CAF50' }}>{uploadStatus}</p>}
                    </div>

                    {/* Personalization Section */}
                    <div className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
                        <h3>🧠 AI Smart Training</h3>
                        <p>Tell the LLM about your financial goals and personal context.</p>
                        <form onSubmit={handlePersonalizationSubmit} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label>Financial Goal (e.g., Save for a house, Retire at 50)</label>
                            <input
                                type="text"
                                placeholder="Goal"
                                value={personalization.goal}
                                onChange={(e) => setPersonalization({ ...personalization, goal: e.target.value })}
                                style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                            />
                            <label>Additional Context (e.g., Family details, Risk preference)</label>
                            <textarea
                                placeholder="Any other info..."
                                value={personalization.context}
                                onChange={(e) => setPersonalization({ ...personalization, context: e.target.value })}
                                style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', minHeight: '80px' }}
                            />
                            <button type="submit" className="primary-btn">
                                Update AI Brain
                            </button>
                        </form>
                        {trainStatus && <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#4CAF50' }}>{trainStatus}</p>}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AccountPage;
