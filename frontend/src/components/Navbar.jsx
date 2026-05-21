import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, LogOut, User, ShieldAlert, Award } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const userString = localStorage.getItem('trinetra_user');
  let user = null;

  if (userString) {
    try {
      user = JSON.parse(userString);
    } catch (e) {
      user = null;
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('trinetra_token');
    localStorage.removeItem('trinetra_user');
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'author') return '/author';
    return '/dashboard';
  };

  return (
    <nav className="glass-panel" style={{
      margin: '16px 24px',
      padding: '12px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-neon)',
      position: 'sticky',
      top: '16px',
      zIndex: 100,
      background: 'rgba(11, 15, 25, 0.8)'
    }}>
      <Link to={getDashboardLink()} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        textDecoration: 'none',
        color: '#fff'
      }}>
        <div style={{
          background: 'rgba(14, 165, 233, 0.15)',
          border: '1px solid var(--primary)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(14, 165, 233, 0.3)'
        }}>
          <Eye size={22} className="glow-text-cyan" style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <span style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            fontFamily: 'var(--font-heading)',
            background: 'linear-gradient(135deg, #fff 30%, var(--primary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.05em'
          }}>
            TRINETRA
          </span>
          <span style={{
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            display: 'block',
            fontWeight: 600,
            letterSpacing: '0.15em',
            marginTop: '-2px'
          }}>
            AI PROCTORING SYSTEM
          </span>
        </div>
      </Link>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="glass-panel" style={{
            padding: '6px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.fullName}</span>
              <span className={`badge ${
                user.role === 'admin' ? 'badge-danger' : 
                user.role === 'author' ? 'badge-primary' : 'badge-success'
              }`} style={{ 
                fontSize: '0.55rem', 
                padding: '2px 6px',
                marginTop: '2px',
                alignSelf: 'flex-start'
              }}>
                {user.role}
              </span>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="btn-cyber-secondary"
            style={{ 
              padding: '8px 16px', 
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
