import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Cpu, ShieldAlert, Lock, User as UserIcon } from 'lucide-react';
import api from '../services/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Retrieve redirect path from location state, default to root
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await api.login(username, password);
      localStorage.setItem('fv_token', response.access_token);
      localStorage.setItem('fv_role', response.role);
      localStorage.setItem('fv_username', response.username);
      
      // Navigate to intended page
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your username and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-industry-bg text-industry-text flex flex-col items-center justify-center px-4 cyber-grid">
      <div className="w-full max-w-md glass-panel p-8 border-t-4 border-t-tesla-red relative overflow-hidden">
        
        {/* Glow Accent */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-tesla-red/10 blur-3xl pointer-events-none"></div>
        
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center space-x-2">
            <Cpu className="h-10 w-10 text-tesla-red" />
            <span className="font-heading text-2xl font-bold tracking-wider">
              FACTORY<span className="text-tesla-red">VISION</span>
            </span>
          </div>
          <p className="text-xs font-mono text-industry-muted mt-2 tracking-widest uppercase">
            Manufacturing Quality Inspection Platform
          </p>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-status-reject/10 border border-status-reject/30 text-status-reject flex items-start space-x-2 text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Username */}
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
              Operator Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-industry-muted">
                <UserIcon className="h-5 w-5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-industry-bg border border-industry-border rounded-lg text-industry-text placeholder-industry-muted/40 focus:outline-none focus:border-tesla-red focus:ring-1 focus:ring-tesla-red transition-all"
                placeholder="operator_name"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
              Access Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-industry-muted">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-industry-bg border border-industry-border rounded-lg text-industry-text placeholder-industry-muted/40 focus:outline-none focus:border-tesla-red focus:ring-1 focus:ring-tesla-red transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-tesla-red hover:bg-tesla-red-dark text-white rounded-lg font-medium shadow-glow-red hover:shadow-tesla-red/50 hover:bg-tesla-darkred disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wider text-sm font-semibold"
          >
            {loading ? 'Initializing Console...' : 'Authenticate Console'}
          </button>
        </form>

        {/* Link to Register */}
        <div className="mt-8 pt-6 border-t border-industry-border text-center text-sm">
          <span className="text-industry-muted">New quality control personnel?</span>{' '}
          <Link to="/register" className="text-tesla-red hover:text-white font-medium transition-colors">
            Register Operator Key
          </Link>
        </div>

        {/* Seed Info Box */}
        <div className="mt-6 p-4 rounded bg-industry-bg border border-industry-border text-xs font-mono text-industry-muted">
          <p className="font-bold text-industry-text mb-1">DEMO OPERATOR LOGINS:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Admin: <span className="text-industry-text">admin</span> / <span className="text-industry-text">admin123</span></li>
            <li>Supervisor: <span className="text-industry-text">supervisor_john</span> / <span className="text-industry-text">supervisor123</span></li>
            <li>Inspector: <span className="text-industry-text">inspector_sarah</span> / <span className="text-industry-text">inspector123</span></li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default Login;
