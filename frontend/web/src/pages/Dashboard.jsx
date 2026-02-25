import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [dashData, setDashData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchDashboardData(false);
    }, []);

    const fetchDashboardData = async (forceRefresh = false) => {
        setLoading(true);
        try {
            const res = await api.post('/chat/dashboard-data', {
                userId: user?.username,
                forceRefresh
            });
            setDashData(res.data);
        } catch (err) {
            console.error('Dashboard data error:', err);
            setError('Unable to load dashboard data.');
            setDashData({ hasData: false });
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        const num = parseFloat(val);
        if (isNaN(num) || num === 0) return '$0.00';
        return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getCategoryIcon = (category) => {
        const c = (category || '').toLowerCase();
        const icons = {
            'food': '🍔', 'groceries': '🛒', 'grocery': '🛒', 'transport': '🚗', 'transportation': '🚗',
            'shopping': '🛍️', 'entertainment': '🎬', 'bills': '📄', 'utilities': '💡',
            'health': '🏥', 'healthcare': '🏥', 'travel': '✈️', 'rent': '🏠', 'housing': '🏠',
            'education': '📚', 'investment': '📈', 'savings': '🏦', 'salary': '💰', 'income': '💰',
            'insurance': '🛡️', 'subscription': '📱', 'dining': '🍽️', 'fuel': '⛽', 'gas': '⛽',
        };
        return icons[c] || '💳';
    };

    const hasData = dashData?.hasData;

    // Filter data based on search query
    const q = searchQuery.toLowerCase();
    const transactions = (dashData?.transactions || []).filter(t =>
        (t.description || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
    );
    const categories = (dashData?.categories || []).filter(c =>
        (c.name || '').toLowerCase().includes(q)
    );
    const goals = (dashData?.goals || []).filter(g =>
        g.toLowerCase().includes(q)
    );

    const statCards = [
        {
            label: 'Total Spending',
            value: hasData ? formatCurrency(dashData.totalSpend) : '—',
            trend: hasData && dashData?.transactions?.length > 0 ? `${dashData.transactions.length} transactions` : 'From your documents',
            trendDirection: 'neutral',
            color: 'blue',
            icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        },
        {
            label: 'Budget Remaining',
            value: hasData ? formatCurrency(dashData.budgetRemaining) : '—',
            trend: 'Based on your budget docs',
            trendDirection: dashData?.budgetRemaining > 0 ? 'up' : 'down',
            color: 'orange',
            icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" strokeLinecap="round" strokeLinejoin="round" /></svg>
        },
        {
            label: 'Savings This Month',
            value: hasData ? formatCurrency(dashData.savingsThisMonth) : '—',
            trend: dashData?.monthlyIncome ? `Income: ${formatCurrency(dashData.monthlyIncome)}` : 'From uploaded data',
            trendDirection: 'up',
            color: 'green',
            icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18" strokeLinecap="round" strokeLinejoin="round" /><polyline points="17,6 23,6 23,12" strokeLinecap="round" strokeLinejoin="round" /></svg>
        },
        {
            label: 'AI Alerts',
            value: hasData ? String(dashData.alertCount || 0) : '0',
            trend: (dashData?.alertCount || 0) > 0 ? 'Needs attention!' : 'All clear',
            trendDirection: (dashData?.alertCount || 0) > 0 ? 'down' : 'neutral',
            color: 'red',
            icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" /><path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" /></svg>
        },
    ];

    return (
        <div className="page-layout">
            <Sidebar />
            <div className="page-content">
                {/* Top Bar */}
                <div className="top-bar">
                    <div className="search-box">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input type="text" placeholder="Search insights, transactions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="top-bar-right">
                        <button className="notification-btn" onClick={() => fetchDashboardData(true)} title="Refresh Data" disabled={loading}>
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={loading ? "spin-icon" : ""}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        <button className="notification-btn">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
                        </button>
                        <div className="top-user" onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>
                            <span className="top-user-name">{user?.username}</span>
                            <div className="top-user-avatar">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="dashboard-loading">
                        <div className="loading-spinner"></div>
                        <p>Analyzing your financial documents with AI...</p>
                    </div>
                )}

                {/* No Data State */}
                {!loading && !hasData && (
                    <div className="no-data-hero">
                        <div className="no-data-icon">
                            <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#3B82F6" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10,9 9,9 8,9" /></svg>
                        </div>
                        <h2>Welcome to your Dashboard!</h2>
                        <p>Upload your financial documents to get AI-powered insights.</p>
                        <div className="no-data-suggestions">
                            <span>📊 Bank Statements</span>
                            <span>💰 Monthly Budget</span>
                            <span>📈 Investment Details</span>
                            <span>🎯 Financial Goals</span>
                        </div>
                        <button className="upload-cta" onClick={() => navigate('/accounts')}>
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            Upload Documents
                        </button>
                    </div>
                )}

                {/* Dashboard with Data */}
                {!loading && hasData && (
                    <>
                        {/* Stat Cards */}
                        <div className="stat-grid">
                            {statCards.map((card, i) => (
                                <div key={i} className={`stat-card stat-${card.color}`}>
                                    <div className="stat-card-header">
                                        <div className={`stat-icon-badge badge-${card.color}`}>
                                            {card.icon}
                                        </div>
                                        <span className={`stat-trend trend-${card.trendDirection}`}>
                                            {card.trendDirection === 'up' && '↑'}
                                            {card.trendDirection === 'down' && '↓'}
                                        </span>
                                    </div>
                                    <div className="stat-label">{card.label}</div>
                                    <div className="stat-value">{card.value}</div>
                                    <div className="stat-detail">{card.trend}</div>
                                </div>
                            ))}
                        </div>

                        {/* Main Content */}
                        <div className="content-grid">
                            {/* Transactions Table */}
                            <div className="card transactions-card">
                                <div className="card-header">
                                    <h2>Recent Transactions</h2>
                                    <button className="view-all-btn" onClick={() => navigate('/accounts')}>Upload More</button>
                                </div>
                                {transactions.length === 0 ? (
                                    <div className="empty-state">
                                        <p>No transactions found in your documents. Upload a bank statement!</p>
                                    </div>
                                ) : (
                                    <table className="tx-table">
                                        <thead>
                                            <tr>
                                                <th>Description</th>
                                                <th>Category</th>
                                                <th>Date</th>
                                                <th>Amount</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map((tx, i) => (
                                                <tr key={i}>
                                                    <td>
                                                        <div className="merchant-cell">
                                                            <span className="merchant-icon">{getCategoryIcon(tx.category)}</span>
                                                            <span className="merchant-name">{tx.description || 'Transaction'}</span>
                                                        </div>
                                                    </td>
                                                    <td><span className="category-tag">{tx.category || 'General'}</span></td>
                                                    <td className="date-cell">{tx.date || '—'}</td>
                                                    <td className="amount-cell">{formatCurrency(tx.amount)}</td>
                                                    <td><span className={`status-pill ${tx.status === 'suspicious' ? 'suspicious' : 'completed'}`}>{tx.status || 'Completed'}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Right Column */}
                            <div className="right-col">
                                {/* AI Insight */}
                                <div className="card ai-insight-card">
                                    <div className="ai-insight-header">
                                        <div className="ai-icon-circle">
                                            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                                        </div>
                                        <h2>AI Financial Insight</h2>
                                    </div>
                                    <div className="ai-insight-body">
                                        <p className="ai-text">{dashData.insight}</p>
                                    </div>
                                    <button className="ai-cta-btn" onClick={() => navigate('/chat')}>
                                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                                        Chat with AI Assistant
                                    </button>
                                </div>

                                {/* Categories or Goals */}
                                {categories.length > 0 && (
                                    <div className="card">
                                        <div className="card-header">
                                            <h2>Spending Categories</h2>
                                        </div>
                                        <div className="category-list">
                                            {categories.map((cat, i) => (
                                                <div key={i} className="category-row">
                                                    <div className="category-left">
                                                        <span className="cat-icon">{getCategoryIcon(cat.name)}</span>
                                                        <span className="cat-name">{cat.name}</span>
                                                    </div>
                                                    <div className="category-right">
                                                        <span className="cat-amount">{formatCurrency(cat.amount)}</span>
                                                        {cat.percentage > 0 && <span className="cat-pct">{cat.percentage}%</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {goals.length > 0 && (
                                    <div className="card goals-card">
                                        <div className="card-header">
                                            <h2>Financial Goals</h2>
                                        </div>
                                        <div className="goals-list">
                                            {goals.map((goal, i) => (
                                                <div key={i} className="goal-item">
                                                    <span className="goal-icon">🎯</span>
                                                    <span>{goal}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
