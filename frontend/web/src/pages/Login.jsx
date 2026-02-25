import { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../Auth.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login({ email, password });
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Animated Background */}
            <div className="auth-bg">
                <div className="floating-shapes">
                    <div className="shape shape-1">💳</div>
                    <div className="shape shape-2">📊</div>
                    <div className="shape shape-3">🏦</div>
                    <div className="shape shape-4">💰</div>
                    <div className="shape shape-5">📈</div>
                    <div className="shape shape-6">🔐</div>
                    <div className="shape shape-7">💎</div>
                    <div className="shape shape-8">🪙</div>
                </div>
                <div className="grid-overlay"></div>
                <div className="glow glow-1"></div>
                <div className="glow glow-2"></div>
                <div className="glow glow-3"></div>
            </div>

            {/* Auth Card */}
            <div className="auth-card">
                <div className="auth-brand">
                    <div className="auth-logo">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" fill="#3B82F6" />
                            <path d="M8 12l2.5 2.5L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1>Fintech AI</h1>
                </div>

                <h2>Welcome back</h2>
                <p className="auth-subtitle">Sign in to your financial command center</p>

                {error && <p className="error-message">{error}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <div className="input-icon-wrapper">
                            <svg className="input-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <div className="input-icon-wrapper">
                            <svg className="input-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                        </div>
                    </div>
                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? (
                            <span className="btn-loading"><span className="spinner"></span> Signing in...</span>
                        ) : (
                            'Sign in to Dashboard'
                        )}
                    </button>
                </form>

                <div className="auth-divider"><span>or</span></div>

                <div className="auth-footer">
                    Don't have an account? <a href="/register">Create free account</a>
                </div>
            </div>
        </div>
    );
};

export default Login;
