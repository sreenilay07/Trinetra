import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Shield, Award, GraduationCap, Lock, Mail, ArrowRight } from 'lucide-react';
import API from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await API.post('/auth/login', { email, password });
      
      const { token, refreshToken, ...user } = response.data;
      
      localStorage.setItem('trinetra_token', token);
      localStorage.setItem('trinetra_user', JSON.stringify(user));
      
      // Redirect based on user role
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'author') {
        navigate('/author');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 120px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Neon Glows */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)',
        top: '10%',
        left: '15%',
        pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(217, 70, 239, 0.1) 0%, transparent 70%)',
        bottom: '10%',
        right: '15%',
        pointerEvents: 'none'
      }}></div>

      <div className="glass-panel-neon float-anim" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '40px',
        background: 'rgba(11, 15, 25, 0.85)',
        border: '1px solid var(--border-neon)',
        animationDuration: '8s'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            background: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid var(--primary)',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 20px rgba(14, 165, 233, 0.25)'
          }}>
            <Lock size={26} style={{ color: 'var(--primary)' }} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
            System Access
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enter credentials to access the TRINETRA Portal.
          </p>
        </div>

        {error && (
          <div className="glass-panel" style={{
            padding: '12px 16px',
            background: 'rgba(244, 63, 94, 0.1)',
            borderColor: 'var(--danger)',
            color: 'var(--danger)',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '1.1rem' }}>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label className="label-cyber">EMAIL ADDRESS</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-dark)' }}>
                <Mail size={18} />
              </span>
              <input
                type="email"
                placeholder="name@example.com"
                className="input-cyber"
                style={{ paddingLeft: '48px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label className="label-cyber">PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-dark)' }}>
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="input-cyber"
                style={{ paddingLeft: '48px', paddingRight: '48px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '15px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-cyber"
            style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
            disabled={loading}
          >
            {loading ? 'Decrypting Access...' : 'Authenticate'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>New user request? </span>
          <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
