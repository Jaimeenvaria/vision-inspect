import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Activity, 
  Camera, 
  Database, 
  FileText, 
  LogOut, 
  Menu, 
  X, 
  User, 
  Cpu 
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const username = localStorage.getItem('fv_username') || 'Operator';
  const role = localStorage.getItem('fv_role') || 'inspector';

  const handleLogout = () => {
    localStorage.removeItem('fv_token');
    localStorage.removeItem('fv_role');
    localStorage.removeItem('fv_username');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'Quality Scanner', path: '/inspect', icon: Camera },
    { name: 'Inspection Logs', path: '/logs', icon: Database },
    { name: 'Reports', path: '/reports', icon: FileText },
  ];

  const getRoleBadgeColor = (roleStr: string) => {
    switch (roleStr.toLowerCase()) {
      case 'admin':
        return 'bg-tesla-red/10 text-tesla-red border-tesla-red/30';
      case 'supervisor':
        return 'bg-status-rework/10 text-status-rework border-status-rework/30';
      default:
        return 'bg-status-pass/10 text-status-pass border-status-pass/30';
    }
  };

  return (
    <div className="min-h-screen bg-industry-bg text-industry-text flex flex-col cyber-grid">
      {/* Top Navbar */}
      <nav className="bg-industry-panel border-b border-industry-border sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Cpu className="h-8 w-8 text-tesla-red animate-pulse" />
                <span className="font-heading text-xl font-bold tracking-wider text-industry-text">
                  FACTORY<span className="text-tesla-red">VISION</span>
                </span>
                <span className="text-xs font-mono px-1.5 py-0.5 rounded border border-industry-border bg-industry-bg text-industry-muted">
                  v1.0
                </span>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-industry-highlight text-industry-text border-b-2 border-tesla-red' 
                        : 'text-industry-muted hover:text-industry-text hover:bg-industry-highlight/50'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Desktop Right Side: Telemetry dot & User details */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Online pulse indicator */}
              <div className="flex items-center space-x-2 border border-industry-border px-3 py-1.5 rounded-full bg-industry-bg">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-pass opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-status-pass"></span>
                </span>
                <span className="text-xs font-mono font-medium text-status-pass uppercase tracking-wide">
                  SYSTEM ONLINE
                </span>
              </div>

              {/* User profile details */}
              <div className="flex items-center space-x-3 border-l border-industry-border pl-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-industry-text leading-tight">{username}</p>
                  <span className={`inline-block text-[10px] uppercase font-mono font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeColor(role)}`}>
                    {role}
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 rounded-full border border-industry-border bg-industry-bg text-industry-muted hover:text-tesla-red hover:border-tesla-red/30 transition-colors"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-industry-muted hover:text-industry-text hover:bg-industry-highlight"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-industry-panel border-t border-industry-border px-2 pt-2 pb-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2.5 rounded-md text-base font-medium ${
                    isActive 
                      ? 'bg-industry-highlight text-industry-text' 
                      : 'text-industry-muted hover:text-industry-text hover:bg-industry-highlight/50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            <div className="border-t border-industry-border pt-4 mt-4 px-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-industry-muted" />
                <div>
                  <p className="text-sm font-medium text-industry-text leading-none">{username}</p>
                  <span className={`inline-block text-[9px] uppercase font-mono px-1 rounded border mt-1 ${getRoleBadgeColor(role)}`}>
                    {role}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-2 rounded border border-tesla-red/30 bg-tesla-red/10 text-tesla-red hover:bg-tesla-red text-sm font-medium transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer console-style */}
      <footer className="bg-industry-panel border-t border-industry-border py-4 text-center text-xs font-mono text-industry-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <div>
            FACTORYVISION AI QUALITY PLATFORM &copy; 2026
          </div>
          <div className="flex space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-status-pass"></span>
              <span>GATEWAY OK</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-status-pass"></span>
              <span>DB CLUSTER CONNECTED</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
