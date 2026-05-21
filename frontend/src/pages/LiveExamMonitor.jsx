import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldAlert, Users, Radio, AlertTriangle, Eye, ArrowLeft, Activity, Bell, FileText, CheckCircle } from 'lucide-react';
import { initiateSocketConnection, getSocket, disconnectSocket, monitorExamRoom } from '../services/socket';
import API from '../services/api';

const LiveExamMonitor = () => {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Real-time monitored student sessions
  const [activeSessions, setActiveSessions] = useState({});
  // Live ticker stream of incoming violations
  const [violationTicker, setViolationTicker] = useState([]);
  // Selected student details view
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  
  const audioContextRef = useRef(null);

  // Synthesize sound warning on new violation
  const playAlertSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4 note
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // Glide up
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Could not play sound alert:", e);
    }
  };

  useEffect(() => {
    // 1. Fetch Exam Meta Details
    const fetchExamDetails = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/exams/${examId}`);
        setExam(res.data.exam);
      } catch (err) {
        setError(err.message || 'Failed to load exam metadata.');
      } finally {
        setLoading(false);
      }
    };

    fetchExamDetails();

    // 2. Establish Real-time Sockets Monitor
    const token = localStorage.getItem('trinetra_token');
    if (token) {
      const socket = initiateSocketConnection(token);

      socket.on('connect', () => {
        console.log('Monitor socket connected. Joining exam room...');
        monitorExamRoom(examId);
      });

      // Event: Candidate Connected
      socket.on('student_connected', ({ studentId, fullName }) => {
        console.log(`Student connected: ${fullName} (${studentId})`);
        setActiveSessions((prev) => ({
          ...prev,
          [studentId]: {
            studentId,
            fullName,
            active: true,
            suspicionScore: prev[studentId]?.suspicionScore || 0,
            violations: prev[studentId]?.violations || []
          }
        }));
      });

      // Event: Candidate Disconnected
      socket.on('student_disconnected', ({ studentId, fullName }) => {
        console.log(`Student disconnected: ${fullName} (${studentId})`);
        setActiveSessions((prev) => {
          if (!prev[studentId]) return prev;
          return {
            ...prev,
            [studentId]: {
              ...prev[studentId],
              active: false
            }
          };
        });
      });

      // Event: Violation Logged
      socket.on('violation_detected', ({ studentId, examId: vExamId, violation }) => {
        if (vExamId !== examId) return;
        console.log('Violation detected in monitor:', violation);
        
        playAlertSound();

        // Update active candidate session lists
        setActiveSessions((prev) => {
          const current = prev[studentId] || {
            studentId,
            fullName: 'Unknown Candidate',
            active: true,
            suspicionScore: 0,
            violations: []
          };

          const newScore = current.suspicionScore + (
            violation.type === 'tab_switch' ? 10 :
            violation.type === 'multiple_faces' ? 30 :
            violation.type === 'no_face_detected' ? 20 :
            violation.type === 'face_turned' ? 15 :
            violation.type === 'mobile_detected' ? 40 :
            violation.type === 'voice_detected' ? 20 :
            violation.type === 'fullscreen_exit' ? 15 : 25
          );

          return {
            ...prev,
            [studentId]: {
              ...current,
              suspicionScore: Math.min(newScore, 100),
              violations: [violation, ...current.violations]
            }
          };
        });

        // Add to live scrolling notification feed
        setViolationTicker((prev) => [
          {
            id: violation._id || Date.now(),
            studentId,
            timestamp: Date.now(),
            type: violation.type,
            severity: violation.severity,
            warningNumber: violation.warningNumber
          },
          ...prev.slice(0, 19) // Cap scrolling feed items
        ]);
      });
    }

    return () => {
      disconnectSocket();
    };
  }, [examId]);

  const activeCandidatesList = Object.values(activeSessions);
  const totalConnected = activeCandidatesList.filter((s) => s.active).length;
  const highRiskCount = activeCandidatesList.filter((s) => s.suspicionScore >= 50).length;

  return (
    <div style={{ maxWidth: '1400px', margin: '40px auto', padding: '0 24px' }}>
      {/* Back Bridge */}
      <Link 
        to="/author" 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: 'var(--primary)', 
          textDecoration: 'none',
          fontWeight: 600,
          marginBottom: '20px',
          fontSize: '0.9rem'
        }}
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      {/* Header Panel */}
      <div className="glass-panel" style={{
        padding: '24px 36px',
        border: '1px solid var(--border-neon)',
        borderRadius: '16px',
        background: 'rgba(11, 15, 25, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--danger)',
              boxShadow: '0 0 10px var(--danger)',
              animation: 'pulse 1.5s infinite'
            }} />
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
              Real-Time Proctor Monitor
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Exam: <strong>{exam ? exam.title : 'Resolving Exam...'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '10px 16px', textAlign: 'center', minWidth: '110px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>CANDIDATES LIVE</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{totalConnected}</span>
          </div>
          <div className="glass-panel" style={{ padding: '10px 16px', textAlign: 'center', minWidth: '110px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>HIGH RISK FLAGS</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>{highRiskCount}</span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="glass-panel" style={{ padding: '24px', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          ⚠️ {error}
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
          Syncing active proctor channels...
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 3fr 2fr',
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* COLUMN 1: CANDIDATES GRID LIST */}
          <div className="glass-panel" style={{ padding: '24px', background: 'rgba(11, 15, 25, 0.6)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--primary)' }} />
              Monitored Feed
            </h3>

            {activeCandidatesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Waiting for student socket connections...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeCandidatesList.map((cand) => (
                  <button
                    key={cand.studentId}
                    onClick={() => setSelectedStudentId(cand.studentId)}
                    className="glass-panel"
                    style={{
                      width: '100%',
                      padding: '16px',
                      textAlign: 'left',
                      background: selectedStudentId === cand.studentId ? 'rgba(14,165,233,0.1)' : 'rgba(255,255,255,0.01)',
                      borderColor: selectedStudentId === cand.studentId ? 'var(--primary)' : 
                                   cand.suspicionScore >= 50 ? 'var(--danger)' : 'var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: cand.active ? 'var(--success)' : 'var(--text-dark)',
                          boxShadow: cand.active ? '0 0 8px var(--success)' : 'none'
                        }} />
                        {cand.fullName}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {cand.studentId.substring(0, 10)}...</span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: cand.suspicionScore >= 50 ? 'var(--danger)' : 
                               cand.suspicionScore >= 20 ? 'var(--warning)' : 'var(--success)'
                      }}>
                        {cand.suspicionScore} suspicion
                      </span>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {cand.violations.length} violations
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* COLUMN 2: DETAILED CANDIDATE AUDIT VIEW */}
          <div className="glass-panel" style={{ padding: '28px', minHeight: '500px' }}>
            {!selectedStudentId ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '400px',
                color: 'var(--text-muted)',
                textAlign: 'center'
              }}>
                <Activity size={48} style={{ color: 'var(--primary)', marginBottom: '16px', opacity: 0.5 }} />
                <h4>Select Candidate</h4>
                <p style={{ fontSize: '0.85rem', maxWidth: '280px', marginTop: '6px' }}>
                  Click on any active student session tile to inspect their AI-driven violations log.
                </p>
              </div>
            ) : (
              <div>
                {(() => {
                  const s = activeSessions[selectedStudentId];
                  if (!s) return null;
                  return (
                    <div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        borderBottom: '1px solid var(--border-color)',
                        paddingBottom: '20px',
                        marginBottom: '24px'
                      }}>
                        <div>
                          <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>CANDIDATE DOSSIER</span>
                          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginTop: '6px' }}>{s.fullName}</h2>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Database Reference ID: {s.studentId}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className={`badge ${s.active ? 'badge-success' : 'badge-danger'}`}>
                            {s.active ? 'Active Socket Connection' : 'Socket Disconnected'}
                          </span>
                        </div>
                      </div>

                      {/* Performance Indicators */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '20px',
                        marginBottom: '28px'
                      }}>
                        <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>PROCTOR RISK ASSESSMENT</span>
                          <h3 style={{
                            fontSize: '1.8rem',
                            fontWeight: 800,
                            color: s.suspicionScore >= 50 ? 'var(--danger)' : 
                                   s.suspicionScore >= 20 ? 'var(--warning)' : 'var(--success)',
                            marginTop: '4px'
                          }}>
                            {s.suspicionScore >= 50 ? 'CRITICAL RISK' : 
                             s.suspicionScore >= 20 ? 'ELEVATED WARNING' : 'NOMINAL SAFETY'}
                          </h3>
                        </div>

                        <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>AI TRUST METRICS</span>
                          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                            {100 - s.suspicionScore}% Integrity
                          </h3>
                        </div>
                      </div>

                      {/* Violations Log Feed */}
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Recorded Violations Timeline</h4>
                      {s.violations.length === 0 ? (
                        <div className="glass-panel" style={{
                          padding: '30px',
                          textAlign: 'center',
                          background: 'rgba(16,185,129,0.03)',
                          border: '1px solid rgba(16,185,129,0.15)',
                          borderRadius: '12px'
                        }}>
                          <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: '8px' }} />
                          <h5 style={{ color: 'var(--success)', fontWeight: 700 }}>Candidate in Full Compliance</h5>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            No tab-switching, gaze deviations, or background violations detected by the Proctor AI.
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {s.violations.map((v, vidx) => (
                            <div key={v._id || vidx} className="glass-panel" style={{
                              padding: '16px',
                              background: 'rgba(255,255,255,0.02)',
                              borderLeft: `4px solid ${
                                v.severity === 'high' ? 'var(--danger)' : 
                                v.severity === 'medium' ? 'var(--warning)' : 'var(--primary)'
                              }`,
                              fontSize: '0.85rem'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '6px' }}>
                                <span style={{ textTransform: 'uppercase', color: '#fff' }}>{v.type.replace('_', ' ')}</span>
                                <span className={`badge ${
                                  v.severity === 'high' ? 'badge-danger' : 
                                  v.severity === 'medium' ? 'badge-warning' : 'badge-primary'
                                }`} style={{ fontSize: '0.55rem', padding: '1px 5px' }}>
                                  {v.severity} Severity
                                </span>
                              </div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                Triggered Warning <strong>#{v.warningNumber}</strong> at {new Date(v.timestamp || Date.now()).toLocaleTimeString()}
                              </div>
                              {v.evidenceImage && (
                                <div style={{ marginTop: '10px' }}>
                                  <img 
                                    src={v.evidenceImage} 
                                    alt="Evidence Snapshot" 
                                    style={{
                                      width: '100%', 
                                      maxHeight: '180px', 
                                      objectFit: 'cover', 
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-color)'
                                    }} 
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* COLUMN 3: REAL-TIME TICKER NOTIFICATIONS */}
          <div className="glass-panel" style={{ padding: '24px', background: 'rgba(11, 15, 25, 0.6)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} style={{ color: 'var(--accent)' }} />
              Live Violation Feed
            </h3>

            {violationTicker.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Operational. Listening for AI-driven violations...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxH: '480px', overflowY: 'auto' }}>
                {violationTicker.map((t) => (
                  <div key={t.id} className="glass-panel" style={{
                    padding: '12px',
                    background: 'rgba(244, 63, 94, 0.05)',
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                    animation: 'flash-in 0.5s ease-out',
                    fontSize: '0.75rem'
                  }}>
                    <style>{`
                      @keyframes flash-in {
                        0% { background: rgba(244, 63, 94, 0.3); transform: scale(0.95); }
                        100% { background: rgba(244, 63, 94, 0.05); transform: scale(1); }
                      }
                    `}</style>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '4px' }}>
                      <span style={{ color: 'var(--danger)', textTransform: 'uppercase' }}>{t.type.replace('_', ' ')}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{new Date(t.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Student: <strong>{activeSessions[t.studentId]?.fullName || 'Candidate'}</strong>
                    </div>
                    <div style={{ marginTop: '2px', color: 'var(--danger)' }}>
                      Warning #{t.warningNumber} issued.
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveExamMonitor;
