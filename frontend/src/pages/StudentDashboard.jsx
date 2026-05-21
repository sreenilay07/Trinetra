import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, GraduationCap, Clock, Award, ShieldAlert, AlertCircle, Play, FileText, CheckCircle } from 'lucide-react';
import API from '../services/api';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [starting, setStarting] = useState(false);

  const [activeTab, setActiveTab] = useState('available'); // 'available', 'results'
  const [myAttempts, setMyAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  const fetchPublishedExams = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/exams/all');
      setExams(res.data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve published exams.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAttempts = async () => {
    try {
      setLoadingAttempts(true);
      setError('');
      const res = await API.get('/attempts/my-attempts');
      setMyAttempts(res.data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve your results.');
    } finally {
      setLoadingAttempts(false);
    }
  };

  useEffect(() => {
    fetchPublishedExams();
  }, []);

  const handleStartExam = async () => {
    if (!selectedExam) return;
    
    setStarting(true);
    setError('');

    try {
      const res = await API.post('/attempts/start', { examId: selectedExam._id });
      const { attemptId } = res.data;
      
      // Navigate directly to the Proctor Exam Portal
      navigate(`/exam-portal/${selectedExam._id}/${attemptId}`);
    } catch (err) {
      setError(err.message || 'Failed to start exam. Make sure the exam window is open and you have not attempted it already.');
      setSelectedExam(null);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Student Portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Assessments feed. Review available tests, read rules, and complete authorized exams.
          </p>
        </div>
        <div className="glass-panel" style={{
          padding: '8px 20px',
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle size={18} style={{ color: 'var(--success)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)', letterSpacing: '0.05em' }}>
            CANDIDATE SAFE
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <button
          onClick={() => { setActiveTab('available'); setSelectedExam(null); }}
          className={`btn-cyber-secondary ${activeTab === 'available' ? 'glow-text-cyan' : ''}`}
          style={{
            borderColor: activeTab === 'available' ? 'var(--primary)' : 'var(--border-color)',
            background: activeTab === 'available' ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
            padding: '10px 20px',
            fontSize: '0.95rem'
          }}
        >
          <GraduationCap size={16} style={{ marginRight: '8px', display: 'inline' }} />
          Available Assessments
        </button>
        <button
          onClick={() => { setActiveTab('results'); setSelectedExam(null); fetchMyAttempts(); }}
          className={`btn-cyber-secondary ${activeTab === 'results' ? 'glow-text-cyan' : ''}`}
          style={{
            borderColor: activeTab === 'results' ? 'var(--primary)' : 'var(--border-color)',
            background: activeTab === 'results' ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
            padding: '10px 20px',
            fontSize: '0.95rem'
          }}
        >
          <Award size={16} style={{ marginRight: '8px', display: 'inline' }} />
          My Results
        </button>
      </div>

      {error && (
        <div className="glass-panel" style={{
          padding: '16px 20px',
          background: 'rgba(244, 63, 94, 0.08)',
          borderColor: 'var(--danger)',
          color: 'var(--danger)',
          borderRadius: '12px',
          marginBottom: '24px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* AVAILABLE TAB VIEW */}
      {activeTab === 'available' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedExam ? '5fr 3fr' : '1fr', gap: '30px', transition: 'all 0.3s ease' }}>
          {/* LEFT COLUMN: EXAMS GRID */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={20} style={{ color: 'var(--primary)' }} />
              Available Assessments
            </h2>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                Polling published exam rosters...
              </div>
            ) : exams.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.6 }} />
                <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px' }}>No Active Exams</h4>
                <p style={{ fontSize: '0.9rem' }}>
                  There are no published exams currently scheduled. Check back later!
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px'
              }}>
                {exams.map((exam) => (
                  <div 
                    key={exam._id} 
                    onClick={() => setSelectedExam(exam)}
                    className="glass-panel-neon" 
                    style={{
                      padding: '24px',
                      background: 'rgba(17, 24, 39, 0.55)',
                      cursor: 'pointer',
                      borderColor: selectedExam?._id === exam._id ? 'var(--primary)' : 'var(--border-color)',
                      boxShadow: selectedExam?._id === exam._id ? '0 0 25px var(--primary-glow)' : 'var(--shadow-premium)',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                      {exam.title}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '20px', height: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {exam.description}
                    </p>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} style={{ color: 'var(--primary)' }} />
                        <span>{exam.duration} Minutes</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Award size={14} style={{ color: 'var(--accent)' }} />
                        <span>{exam.totalMarks} Marks</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: PROCTORING GATEWAY (SELECTED EXAM INSTRUCTIONS) */}
          {selectedExam && (
            <div className="glass-panel" style={{
              padding: '28px',
              background: 'rgba(11, 15, 25, 0.85)',
              border: '1px solid var(--border-neon)',
              height: 'fit-content',
              position: 'sticky',
              top: '110px'
            }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>Proctoring Gateway</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>{selectedExam.title}</span>
              
              <hr style={{ margin: '16px 0', borderColor: 'var(--border-color)' }} />

              {/* Warnings Alert */}
              <div className="glass-panel" style={{
                padding: '12px 16px',
                background: 'rgba(244, 63, 94, 0.05)',
                borderColor: 'var(--danger)',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                lineHeight: '1.5'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 700, marginBottom: '4px' }}>
                  <ShieldAlert size={14} />
                  AI PROCTORING PROTOCOLS ENFORCED
                </div>
                Your activity is monitored continuously in real-time. The exam will **auto-submit** immediately if:
                <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                  <li>You exit fullscreen lock.</li>
                  <li>You change, minimize, or switch browser tabs.</li>
                  <li>You accumulate more than <strong>{selectedExam.rules?.maxWarnings || 3} warnings</strong>.</li>
                </ul>
              </div>

              {/* Timings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
                <div>📅 Start Window: <strong style={{ color: '#fff' }}>{new Date(selectedExam.startTime).toLocaleString()}</strong></div>
                <div>📅 End Window: <strong style={{ color: '#fff' }}>{new Date(selectedExam.endTime).toLocaleString()}</strong></div>
                <div>📑 Rules Index: <strong style={{ color: '#fff' }}>1 Attempt Allowed Only</strong></div>
              </div>

              {/* Instructions */}
              <h4 style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700, marginBottom: '8px' }}>Instructions:</h4>
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '12px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                whiteSpace: 'pre-wrap',
                maxHeight: '150px',
                overflowY: 'auto',
                marginBottom: '28px',
                border: '1px solid var(--border-color)'
              }}>
                {selectedExam.instructions}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={handleStartExam} 
                  className="btn-cyber" 
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={starting}
                >
                  <Play size={16} />
                  {starting ? 'Acquiring Feed...' : 'Launch Secured Portal'}
                </button>
                <button 
                  onClick={() => setSelectedExam(null)} 
                  className="btn-cyber-secondary"
                  style={{ padding: '10px 16px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESULTS HISTORY TAB VIEW */}
      {activeTab === 'results' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} style={{ color: 'var(--accent)' }} />
            Assessment History & Receipts
          </h2>

          {loadingAttempts ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Retrieving your evaluation history...
            </div>
          ) : myAttempts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.6 }} />
              <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px' }}>No Attempt History Found</h4>
              <p style={{ fontSize: '0.9rem' }}>
                You have not completed any secured exams yet. Completed exam reports will list here!
              </p>
            </div>
          ) : (
            <div className="cyber-table-container">
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>Exam Assessment</th>
                    <th>Status</th>
                    <th>Score Secured</th>
                    <th>Completion Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myAttempts.map((att) => (
                    <tr key={att._id}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{att.examId?.title || 'Unknown Exam'}</td>
                      <td>
                        <span className={`badge ${
                          att.status === 'submitted' ? 'badge-success' :
                          att.status === 'terminated' ? 'badge-danger' : 'badge-warning'
                        }`} style={{ textTransform: 'capitalize' }}>
                          {att.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {att.status === 'active' ? 'Ungraded' : `${att.score} / ${att.examId?.totalMarks || 0} marks`}
                      </td>
                      <td>{new Date(att.submittedAt || att.createdAt).toLocaleString()}</td>
                      <td>
                        {att.status !== 'active' ? (
                          <button
                            onClick={() => navigate(`/exam-result/${att._id}`)}
                            className="btn-cyber"
                            style={{
                              padding: '6px 14px',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Eye size={12} />
                            View Results Receipt
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/exam-portal/${att.examId?._id}/${att._id}`)}
                            className="btn-cyber"
                            style={{
                              padding: '6px 14px',
                              fontSize: '0.75rem',
                              background: 'linear-gradient(135deg, var(--accent) 0%, #a21caf 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            Resume Secure Sandbox
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
