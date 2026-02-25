import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import Sidebar from '../components/Sidebar';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Mock data for "WOW" factor
    const stats = [
        { label: 'Total Balance', value: '$12,450.00', trend: '+2.5%', type: 'positive' },
        { label: 'Monthly Spending', value: '$3,210.45', trend: '-8.1%', type: 'negative' },
        { label: 'Savings Rate', value: '24%', trend: '+1.2%', type: 'positive' },
    ];

    const recentTx = [
        { merchant: 'Apple Store', category: 'Electronics', amount: '-$154.00', date: 'Today' },
        { merchant: 'Starbucks', category: 'Food', amount: '-$12.50', date: 'Yesterday' },
        { merchant: 'Netflix', category: 'Entertainment', amount: '-$15.99', date: 'Feb 8' },
    ];

    return (
        <div className="dashboard-container">
            <Sidebar />
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p className="welcome-text">Welcome back, {user?.username}!</p>
                    </div>
                </div>

                <div className="dashboard-stats">
                    {stats.map((stat, i) => (
                        <div key={i} className="stat-card">
                            <h3>{stat.label}</h3>
                            <div className="value">{stat.value}</div>
                            <div className={`trend ${stat.type}`}>{stat.trend} from last month</div>
                        </div>
                    ))}
                </div>

                <div className="dashboard-main">
                    <div className="main-left">
                        <div className="card">
                            <h2>Recent Activity</h2>
                            <div className="tx-list">
                                {recentTx.map((tx, i) => (
                                    <div key={i} className="tx-item">
                                        <div className="tx-info">
                                            <h4>{tx.merchant}</h4>
                                            <p>{tx.category} • {tx.date}</p>
                                        </div>
                                        <div className="tx-amount">{tx.amount}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="main-right">
                        <div className="card profile-summary">
                            <h2>Your Profile</h2>
                            <div className="profile-details">
                                <p><strong>Username:</strong> {user?.username}</p>
                                <p><strong>Email:</strong> {user?.email}</p>
                                <p><strong>Status:</strong> <span className="status-badge">Active</span></p>
                                <p><strong>Account:</strong> Premium</p>
                            </div>
                        </div>

                        <div className="ai-brief">
                            <h2>AI Financial Insight</h2>
                            <p>
                                "You spent 12% more on electronics this month than usual.
                                If you maintain your current savings rate, you'll reach your
                                emergency fund goal in 4 months."
                            </p>
                            <button className="ask-ai-btn" onClick={() => navigate('/chat')}>
                                Ask Assistant Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
