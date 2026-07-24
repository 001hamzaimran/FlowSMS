import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { MessageSquare, PlusCircle, LayoutDashboard, LogOut, User, RefreshCw } from 'lucide-react';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleReconnectGoogle = async () => {
    try {
      const res = await api.get('/auth/google/url');
      if (res.data.success && res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      alert('Failed to initiate Google reconnect: ' + err.message);
    }
  };

  if (!user) return null;

  return (
    <header style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#0284c7', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <MessageSquare size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', lineHeight: '1.2' }}>SMS Flow</h1>
            <p style={{ fontSize: '11px', color: '#94a3b8' }}>Automation Platform</p>
          </div>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            to="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: location.pathname === '/dashboard' ? '#38bdf8' : '#cbd5e1',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>

          <Link to="/flows/new" className="btn-primary" style={{ padding: '8px 14px', fontSize: '13px' }}>
            <PlusCircle size={16} />
            New Flow
          </Link>

          <button
            type="button"
            onClick={handleReconnectGoogle}
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: '12px' }}
            title="Reconnect Google Account to grant updated scopes & refresh tokens"
          >
            <RefreshCw size={14} />
            Reconnect Google
          </button>

          <div style={{ height: '24px', width: '1px', backgroundColor: '#334155' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <User size={16} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{user.name || 'User'}</p>
              <p style={{ fontSize: '11px', color: '#94a3b8' }}>{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', marginLeft: '6px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};
