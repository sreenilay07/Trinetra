import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Award, GraduationCap, Lock, Mail, User, ArrowRight } from 'lucide-react';
import API from '../services/api';

const Signup = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // student, author, admin
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await API.post('/auth/signup', {
        fullName,
        email,
        password,
        role
      });

      if (role === 'author') {
        setSuccess('Author registration request submitted! Your account is pending admin approval.');
        setFullName('');
        setEmail('');
        setPassword('');
      } else {
        const { token, refreshToken, ...user } = response.data;
        localStorage.setItem('trinetra_token', token);
        localStorage.setItem('trinetra_user', JSON.stringify(user));
        
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.message || 'Signup failed. Email might already be taken.');
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
        background: 'radial-gradient(circle, rgba(217, 70, 239, 0.1) 0%, transparent 70%)',
        top: '10%',
        left: '15%',
        pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)',
        bottom: '10%',
        right: '15%',
        pointerEvents: 'none'
      }}></div>

      <div className="glass-panel-neon float-anim" style={{
        width: '100%',
        maxWidth: '500px',
        padding: '40px',
        background: 'rgba(11, 15, 25, 0.85)',
        border: '1px solid var(--border-neon)',
        animationDuration: '10s'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
            Create Account
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Register to join the TRINETRA AI Proctoring Network.
          </p>
        </div>

        {error && (
          <div className="glass-panel" style={{
            padding: '12px 16px',
            background: 'rgba(244, 63, 94, 0.1)',
            borderColor: 'var(--danger)',
            color: 'var(--danger)',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="glass-panel" style={{
            padding: '16px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderColor: 'var(--success)',
            color: 'var(--success)',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            ✅ {success}
            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              You will receive an email confirmation once the Administrator reviews and approves your credentials.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Role selector buttons */}
          <div style={{ marginBottom: '20px' }}>
            <label className="label-cyber">SELECT SYSTEM ROLE</label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              marginTop: '4px'
            }}>
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`btn-cyber-secondary ${role === 'student' ? 'glow-text-cyan' : ''}`}
                style={{
                  padding: '12px 6px',
                  fontSize: '0.8rem',
                  flexDirection: 'column',
                  gap: '6px',
                  background: role === 'student' ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                  borderColor: role === 'student' ? 'var(--primary)' : 'var(--border-color)',
                  color: role === 'student' ? '#fff' : 'var(--text-muted)'
                }}
              >
                <GraduationCap size={20} />
                Student
              </button>

              <button
                type="button"
                onClick={() => setRole('author')}
                className={`btn-cyber-secondary ${role === 'author' ? 'glow-text-cyan' : ''}`}
                style={{
                  padding: '12px 6px',
                  fontSize: '0.8rem',
                  flexDirection: 'column',
                  gap: '6px',
                  background: role === 'author' ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                  borderColor: role === 'author' ? 'var(--primary)' : 'var(--border-color)',
                  color: role === 'author' ? '#fff' : 'var(--text-muted)'
                }}
              >
                <Award size={20} />
                Author
              </button>
            </div>

            {role === 'author' && (
              <div style={{
                marginTop: '12px',
                fontSize: '0.75rem',
                color: 'var(--warning)',
                background: 'rgba(245, 158, 11, 0.08)',
                padding: '10px 14px',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '6px',
                lineHeight: '1.4'
              }}>
                ℹ️ <strong>Admin Approval Required:</strong> Author accounts are initially locked. You will be able to log in only after an administrator reviews and approves your account.
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="label-cyber">FULL NAME</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-dark)' }}>
                <User size={18} />
              </span>
              <input
                type="text"
                placeholder="John Doe"
                className="input-cyber"
                style={{ paddingLeft: '48px' }}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
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

          <div style={{ marginBottom: '24px' }}>
            <label className="label-cyber">PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-dark)' }}>
                <Lock size={18} />
              </span>
              <input
                type="password"
                placeholder="Min. 6 characters"
                className="input-cyber"
                style={{ paddingLeft: '48px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-cyber"
            style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
            disabled={loading}
          >
            {loading ? 'Creating Credentials...' : 'Register Account'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Already registered? </span>
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            System Access
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
