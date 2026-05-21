import React, { useState, useEffect } from 'react';
import { Check, X, ShieldAlert, Users, Award, ShieldCheck, Mail, Calendar } from 'lucide-react';
import API from '../services/api';

const AdminDashboard = () => {
  const [pendingAuthors, setPendingAuthors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchPendingAuthors = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/admin/pending-authors');
      setPendingAuthors(res.data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve pending authors.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await API.get('/admin/users');
      setAllUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch all users:', err);
    }
  };

  useEffect(() => {
    fetchPendingAuthors();
    fetchAllUsers();
  }, []);

  const handleApprove = async (id, name) => {
    try {
      setError('');
      setSuccessMessage('');
      const res = await API.put(`/admin/approve-author/${id}`);
      setSuccessMessage(`Successfully approved author "${name}"!`);
      // Refresh list
      setPendingAuthors(pendingAuthors.filter((author) => author._id !== id));
    } catch (err) {
      setError(err.message || `Failed to approve author ${name}.`);
    }
  };

  const handleReject = async (id, name) => {
    if (!window.confirm(`Are you sure you want to REJECT and delete the author request from "${name}"?`)) {
      return;
    }

    try {
      setError('');
      setSuccessMessage('');
      await API.put(`/admin/reject-author/${id}`);
      setSuccessMessage(`Rejected and removed author request from "${name}".`);
      // Refresh list
      setPendingAuthors(pendingAuthors.filter((author) => author._id !== id));
    } catch (err) {
      setError(err.message || `Failed to reject author ${name}.`);
    }
  };

  const handleToggleStatus = async (id, name, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} user "${name}"?`)) {
      return;
    }

    try {
      setError('');
      setSuccessMessage('');
      await API.put(`/admin/users/${id}/toggle-status`);
      setSuccessMessage(`User "${name}" is now ${currentStatus ? 'inactive' : 'active'}.`);
      setAllUsers(allUsers.map(user => 
        user._id === id ? { ...user, isActive: !user.isActive } : user
      ));
    } catch (err) {
      setError(err.message || `Failed to update status for ${name}.`);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
      {/* Header section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Admin Console</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            System authorization, access controls, and user lifecycle management.
          </p>
        </div>
        <div className="glass-panel" style={{
          padding: '8px 20px',
          background: 'rgba(244, 63, 94, 0.05)',
          border: '1px solid rgba(244, 63, 94, 0.2)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <ShieldAlert size={18} style={{ color: 'var(--danger)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--danger)', letterSpacing: '0.05em' }}>
            ADMIN ACCESS ACTIVE
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '40px'
      }}>
        <div className="glass-panel-neon" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            background: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid var(--primary)',
            borderRadius: '12px',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Pending Author Approval
            </span>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '2px', color: '#fff' }}>
              {pendingAuthors.length}
            </h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--success)',
            borderRadius: '12px',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={24} style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Security Status
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '4px', color: 'var(--success)' }}>
              All Systems Operational
            </h3>
          </div>
        </div>
      </div>

      {/* Notifications */}
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

      {successMessage && (
        <div className="glass-panel" style={{
          padding: '16px 20px',
          background: 'rgba(16, 185, 129, 0.08)',
          borderColor: 'var(--success)',
          color: 'var(--success)',
          borderRadius: '12px',
          marginBottom: '24px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          ✅ {successMessage}
        </div>
      )}

      {/* Pending Author Table Section */}
      <div className="glass-panel" style={{ padding: '28px', background: 'rgba(11, 15, 25, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Award size={20} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Pending Author Request Log</h2>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--border-neon)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <span>Polling authorized registration records...</span>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : pendingAuthors.length === 0 ? (
          <div className="glass-panel" style={{
            textAlign: 'center',
            padding: '48px',
            background: 'rgba(255, 255, 255, 0.02)',
            color: 'var(--text-muted)'
          }}>
            <ShieldCheck size={48} style={{ color: 'var(--success)', marginBottom: '16px', opacity: 0.8 }} />
            <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>
              No Pending Requests Found
            </h4>
            <p style={{ fontSize: '0.9rem' }}>
              All author credentials on file have been successfully processed and verified.
            </p>
          </div>
        ) : (
          <div className="cyber-table-container">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Authorization Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingAuthors.map((author) => (
                  <tr key={author._id}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{author.fullName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        <Mail size={14} />
                        {author.email}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        <Calendar size={14} />
                        {new Date(author.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-warning">
                        Pending Admin Approval
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '10px' }}>
                        <button
                          onClick={() => handleApprove(author._id, author.fullName)}
                          className="btn-cyber"
                          style={{
                            padding: '8px 14px',
                            fontSize: '0.8rem',
                            background: 'linear-gradient(135deg, var(--success) 0%, #047857 100%)',
                            boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                          }}
                        >
                          <Check size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(author._id, author.fullName)}
                          className="btn-cyber-danger"
                          style={{
                            padding: '8px 14px',
                            fontSize: '0.8rem'
                          }}
                        >
                          <X size={14} />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Management Section */}
      <div className="glass-panel" style={{ padding: '28px', background: 'rgba(11, 15, 25, 0.5)', marginTop: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Users size={20} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>System Users Management</h2>
        </div>

        {allUsers.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</div>
        ) : (
          <div className="cyber-table-container">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(user => (
                  <tr key={user._id}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{user.fullName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        <Mail size={14} />
                        {user.email}
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{user.role}</td>
                    <td>
                      {user.isActive !== false ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-danger">Inactive</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleStatus(user._id, user.fullName, user.isActive !== false)}
                        className={user.isActive !== false ? 'btn-cyber-danger' : 'btn-cyber'}
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        {user.isActive !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
