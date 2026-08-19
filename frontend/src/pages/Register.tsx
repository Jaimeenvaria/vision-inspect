import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Cpu, ShieldCheck, Mail, Lock, User as UserIcon, ShieldAlert } from 'lucide-react';
import api from '../services/api';

export const Register: React.FC = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'inspector' | 'supervisor' | 'admin'>('inspector');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password || !role) {
      setError('Please fill in all input fields.');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await api.register({ username, email, password, role });
      setSuccess('Operator key registered successfully! Redirecting to login console...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Choose a different username or email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-industry-bg text-industry-text flex flex-col items-center justify-center px-4 cyber-grid">
      <div className="w-full max-w-md glass-panel p-8 border-t-4 border-t-tesla-red relative overflow-hidden">
        
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-tesla-red/10 blur-3xl pointer-events-none"></div>

        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center space-x-2">
            <Cpu className="h-10 w-10 text-tesla-red" />
            <span className="font-heading text-2xl font-bold tracking-wider">
              FACTORY<span className="text-tesla-red">VISION</span>
            </span>
          </div>
          <p className="text-xs font-mono text-industry-muted mt-2 tracking-widest uppercase">
            Create Operator Console Profile
          </p>
        </div>

        {/* Status Callouts */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-status-reject/10 border border-status-reject/30 text-status-reject flex items-start space-x-2 text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-status-pass/10 border border-status-pass/30 text-status-pass flex items-start space-x-2 text-sm">
            <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
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
                className="block w-full pl-10 pr-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text placeholder-industry-muted/40 focus:outline-none focus:border-tesla-red focus:ring-1 focus:ring-tesla-red transition-all"
                placeholder="inspector_name"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
              Corporate Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-industry-muted">
                <Mail className="h-5 w-5" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text placeholder-industry-muted/40 focus:outline-none focus:border-tesla-red focus:ring-1 focus:ring-tesla-red transition-all"
                placeholder="name@tesla.com"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
              Access Password (Min 6 chars)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-industry-muted">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text placeholder-industry-muted/40 focus:outline-none focus:border-tesla-red focus:ring-1 focus:ring-tesla-red transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
              Clearance Level / Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="block w-full px-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text focus:outline-none focus:border-tesla-red focus:ring-1 focus:ring-tesla-red transition-all"
            >
              <option value="inspector">Quality Inspector (Scan & Log)</option>
              <option value="supervisor">Production Supervisor (Manage & Export)</option>
              <option value="admin">System Administrator (Full access)</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-tesla-red hover:bg-tesla-red-dark text-white rounded-lg font-medium shadow-glow-red hover:shadow-tesla-red/50 hover:bg-tesla-darkred disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wider text-sm font-semibold"
          >
            {loading ? 'Submitting Registry...' : 'Register Operator Profile'}
          </button>
        </form>

        {/* Link to Login */}
        <div className="mt-8 pt-6 border-t border-industry-border text-center text-sm">
          <span className="text-industry-muted">Already have a registered key?</span>{' '}
          <Link to="/login" className="text-tesla-red hover:text-white font-medium transition-colors">
            Login to Console
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Register;
