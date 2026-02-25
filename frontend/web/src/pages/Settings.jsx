import { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import Sidebar from '../components/Sidebar';
import './Settings.css';

const Settings = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
        { id: 'preferences', label: 'Preferences', icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg> },
        { id: 'security', label: 'Security', icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg> },
        { id: 'notifications', label: 'Notifications', icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg> },
    ];

    return (
        <div className="page-layout">
            <Sidebar />
            <div className="settings-page">
                <div className="settings-header">
                    <h1>Settings</h1>
                    <p className="settings-subtitle">Manage your account and preferences</p>
                </div>

                <div className="settings-layout">
                    {/* Tab Navigation */}
                    <div className="settings-tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="settings-content">
                        {activeTab === 'profile' && (
                            <div className="settings-section">
                                <h2>Your Profile</h2>
                                <div className="profile-card">
                                    <div className="profile-avatar-lg">
                                        {user?.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="profile-info-grid">
                                        <div className="profile-field">
                                            <label>Username</label>
                                            <div className="field-value">{user?.username || '—'}</div>
                                        </div>
                                        <div className="profile-field">
                                            <label>Email</label>
                                            <div className="field-value">{user?.email || '—'}</div>
                                        </div>
                                        <div className="profile-field">
                                            <label>Account Type</label>
                                            <div className="field-value">
                                                <span className="premium-badge">Premium</span>
                                            </div>
                                        </div>
                                        <div className="profile-field">
                                            <label>Member Since</label>
                                            <div className="field-value">February 2025</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="stats-row">
                                    <div className="mini-stat">
                                        <div className="mini-stat-value">Active</div>
                                        <div className="mini-stat-label">AI Status</div>
                                    </div>
                                    <div className="mini-stat">
                                        <div className="mini-stat-value">Gemini</div>
                                        <div className="mini-stat-label">AI Provider</div>
                                    </div>
                                    <div className="mini-stat">
                                        <div className="mini-stat-value">RAG</div>
                                        <div className="mini-stat-label">Processing</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'preferences' && (
                            <div className="settings-section">
                                <h2>Preferences</h2>
                                <div className="pref-list">
                                    <div className="pref-item">
                                        <div className="pref-info">
                                            <h4>Currency</h4>
                                            <p>Default currency for display</p>
                                        </div>
                                        <select className="pref-select">
                                            <option>USD ($)</option>
                                            <option>EUR (€)</option>
                                            <option>GBP (£)</option>
                                            <option>INR (₹)</option>
                                        </select>
                                    </div>
                                    <div className="pref-item">
                                        <div className="pref-info">
                                            <h4>AI Response Style</h4>
                                            <p>How the AI formats answers</p>
                                        </div>
                                        <select className="pref-select">
                                            <option>Concise</option>
                                            <option>Detailed</option>
                                            <option>Technical</option>
                                        </select>
                                    </div>
                                    <div className="pref-item">
                                        <div className="pref-info">
                                            <h4>Dark Mode</h4>
                                            <p>Switch to dark theme</p>
                                        </div>
                                        <div className="toggle-switch">
                                            <span className="toggle-label">Coming Soon</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="settings-section">
                                <h2>Security</h2>
                                <div className="pref-list">
                                    <div className="pref-item">
                                        <div className="pref-info">
                                            <h4>Change Password</h4>
                                            <p>Update your account password</p>
                                        </div>
                                        <button className="action-btn">Update</button>
                                    </div>
                                    <div className="pref-item">
                                        <div className="pref-info">
                                            <h4>Two-Factor Authentication</h4>
                                            <p>Add an extra layer of security</p>
                                        </div>
                                        <div className="toggle-switch">
                                            <span className="toggle-label">Coming Soon</span>
                                        </div>
                                    </div>
                                    <div className="pref-item">
                                        <div className="pref-info">
                                            <h4>Active Sessions</h4>
                                            <p>Manage your logged-in devices</p>
                                        </div>
                                        <span className="session-count">1 device</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="settings-section">
                                <h2>Notifications</h2>
                                <div className="pref-list">
                                    <div className="pref-item">
                                        <div className="pref-info">
                                            <h4>Compliance Alerts</h4>
                                            <p>Get notified about suspicious transactions</p>
                                        </div>
                                        <div className="toggle-switch on">
                                            <span className="toggle-label">Enabled</span>
                                        </div>
                                    </div>
                                    <div className="pref-item">
                                        <div className="pref-info">
                                            <h4>AI Insights</h4>
                                            <p>Weekly AI financial summary</p>
                                        </div>
                                        <div className="toggle-switch on">
                                            <span className="toggle-label">Enabled</span>
                                        </div>
                                    </div>
                                    <div className="pref-item">
                                        <div className="pref-info">
                                            <h4>Budget Warnings</h4>
                                            <p>Alert when spending exceeds budget</p>
                                        </div>
                                        <div className="toggle-switch on">
                                            <span className="toggle-label">Enabled</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Danger Zone */}
                        <div className="danger-zone">
                            <h3>Danger Zone</h3>
                            <div className="danger-item">
                                <div>
                                    <h4>Sign Out</h4>
                                    <p>Log out of your account on this device</p>
                                </div>
                                <button className="danger-btn" onClick={logout}>Sign Out</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
