import React, { useState, useEffect } from 'react';
import { useParams as getParams, useNavigate } from 'react-router-dom';
import { Award, AlertTriangle, ArrowRight, ShieldCheck, Mail, Calendar, Clock, BarChart2 } from 'lucide-react';
import API from '../services/api';

const ExamResult = () => {
  const { attemptId } = getParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await API.get(`/attempts/result/${attemptId}`);
        setResult(res.data);
      } catch (err) {
        setError(err.message || 'Failed to retrieve assessment results.');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Generating secure assessment receipt...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 24px' }}>
        <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          <AlertTriangle size={48} style={{ margin: '0 auto 16px' }} />
          <h3>Access Blocked</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px', marginBottom: '24px' }}>
            {error}
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-cyber">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isTerminated = result.status === 'terminated';
  const scorePercentage = result.examId ? Math.round((result.score / result.examId.totalMarks) * 100) : 0;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px' }}>
      
      {/* Visual Success/Failure banner */}
      <div className="glass-panel-neon float-anim" style={{
        padding: '40px',
        background: isTerminated ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)',
        borderColor: isTerminated ? 'var(--danger)' : 'var(--success)',
        boxShadow: isTerminated ? '0 0 30px rgba(244, 63, 94, 0.15)' : '0 0 30px rgba(16, 185, 129, 0.15)',
        textAlign: 'center',
        borderRadius: '20px',
        marginBottom: '32px',
        animationDuration: '12s'
      }}>
        {isTerminated ? (
          <div>
            <AlertTriangle size={60} style={{ color: 'var(--danger)', margin: '0 auto 16px', filter: 'drop-shadow(0 0 10px var(--danger-glow))' }} />
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)' }}>
              Attempt Terminated
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '500px', margin: '8px auto 0', lineHeight: '1.6' }}>
              Your session was automatically halted by the Proctor AI. Reason: <strong style={{ color: 'var(--danger)' }}>{result.submissionReason || 'Multiple tab-switching or gaze violations.'}</strong>
            </p>
          </div>
        ) : (
          <div>
            <ShieldCheck size={60} style={{ color: 'var(--success)', margin: '0 auto 16px', filter: 'drop-shadow(0 0 10px var(--success-glow))' }} />
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
              Assessment Completed
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '500px', margin: '8px auto 0', lineHeight: '1.6' }}>
              Your exam has been successfully registered. The Proctor AI verified the full session integrity.
            </p>
          </div>
        )}
      </div>
 
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Score Obtained
          </span>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
            {result.score} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {result.examId?.totalMarks || 100}</span>
          </h2>
          <span className="badge badge-primary" style={{ fontSize: '0.65rem', marginTop: '6px' }}>
            {scorePercentage}% rating
          </span>
        </div>
 
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            AI Gaze Integrity
          </span>
          <h2 style={{ 
            fontSize: '2.2rem', 
            fontWeight: 800, 
            color: result.suspicionScore >= 50 ? 'var(--danger)' : 
                   result.suspicionScore >= 20 ? 'var(--warning)' : 'var(--success)',
            marginTop: '4px' 
          }}>
            {100 - result.suspicionScore}%
          </h2>
          <span className={`badge ${
            result.suspicionScore >= 50 ? 'badge-danger' : 
            result.suspicionScore >= 20 ? 'badge-warning' : 'badge-success'
          }`} style={{ fontSize: '0.65rem', marginTop: '6px' }}>
            {result.suspicionScore} suspicion score
          </span>
        </div>
 
      </div>
 
      {/* Attempt Details */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px', background: 'rgba(11, 15, 25, 0.5)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart2 size={18} style={{ color: 'var(--primary)' }} />
          Assessment Audit Log
        </h3>
 
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          fontSize: '0.85rem',
          color: 'var(--text-muted)'
        }}>
          <div>📑 Exam Title: <strong style={{ color: '#fff' }}>{result.examId?.title || 'Unknown Exam'}</strong></div>
          <div>👤 Student Candidate: <strong style={{ color: '#fff' }}>{result.studentId?.fullName}</strong></div>
          <div>✉️ registered email: <strong style={{ color: '#fff' }}>{result.studentId?.email}</strong></div>
          <div>📅 Date Submitted: <strong style={{ color: '#fff' }}>{new Date(result.submittedAt || result.createdAt).toLocaleString()}</strong></div>
          <div style={{ gridColumn: '1 / -1', marginTop: '10px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛡️ Submission Reason: <strong style={{ color: result.autoSubmitted ? 'var(--danger)' : 'var(--success)' }}>{result.submissionReason || (result.autoSubmitted ? 'Auto submitted due to violation' : 'Standard manual submission')}</strong>
          </div>
        </div>

        {/* Email notifier info */}
        <hr style={{ margin: '20px 0', borderColor: 'var(--border-color)' }} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.8rem',
          color: 'var(--success)',
          background: 'rgba(16, 185, 129, 0.05)',
          padding: '10px 14px',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          borderRadius: '8px'
        }}>
          <Mail size={16} />
          <span>An official receipt certificate has been dispatched to <strong>{result.studentId?.email}</strong>.</span>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="btn-cyber"
          style={{ padding: '14px 28px' }}
        >
          Return to Assessments Feed
          <ArrowRight size={16} />
        </button>
      </div>

    </div>
  );
};

export default ExamResult;
