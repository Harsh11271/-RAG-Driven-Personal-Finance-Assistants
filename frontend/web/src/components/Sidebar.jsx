import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h3>FINANCE AI</h3>
            </div>

            <div className="sidebar-menu">
                <button
                    className={isActive('/dashboard') ? 'active' : ''}
                    onClick={() => navigate('/dashboard')}
                >
                    Dashboard
                </button>
                <button
                    className={isActive('/chat') ? 'active' : ''}
                    onClick={() => navigate('/chat')}
                >
                    AI Assistant
                </button>
                <button
                    className={isActive('/accounts') ? 'active' : ''}
                    onClick={() => navigate('/accounts')}
                >
                    Accounts
                </button>

                <button
                    className={isActive('/settings') ? 'active' : ''}
                    onClick={() => navigate('/dashboard')}
                >
                    Settings
                </button>
            </div>

            <div className="sidebar-footer">
                <div className="user-profile">
                    <div className="avatar">
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                        <p>{user?.username}</p>
                    </div>
                </div>
                <button className="logout-btn" onClick={logout}>
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
