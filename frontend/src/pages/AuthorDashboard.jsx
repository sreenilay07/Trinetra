import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, List, PlusCircle, Trash, Play, BarChart2, Eye, EyeOff, BookOpen, AlertCircle, FileText, ChevronRight, Award, PlusSquare, Download, RefreshCw } from 'lucide-react';
import API from '../services/api';

const AuthorDashboard = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'create', 'reports'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Exam Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examType, setExamType] = useState('both');
  const [duration, setDuration] = useState(60);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxWarnings, setMaxWarnings] = useState(3);
  const [instructions, setInstructions] = useState('1. Keep your camera active.\n2. Do not switch tabs or exit fullscreen.\n3. Keep your face centered.');
  
  // Manage Question Modal State
  const [selectedExam, setSelectedExam] = useState(null);
  const [questionType, setQuestionType] = useState('mcq');
  const [questionText, setQuestionText] = useState('');
  const [qDifficulty, setQDifficulty] = useState('medium');
  const [qMarks, setQMarks] = useState(5);
  const [options, setOptions] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false }
  ]);
  const [testCases, setTestCases] = useState([{ input: '', expectedOutput: '' }]);
  const [examQuestions, setExamQuestions] = useState([]);

  // Reports state
  const [reportExamId, setReportExamId] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Edit Exam Settings State
  const [editingExam, setEditingExam] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDuration, setEditDuration] = useState(60);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editMaxWarnings, setEditMaxWarnings] = useState(3);
  const [editInstructions, setEditInstructions] = useState('');

  // Editing Question State
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Gemini Key Config State
  const [geminiStatus, setGeminiStatus] = useState({ isConfigured: false, source: '', maskedKey: '' });
  const [newGeminiKey, setNewGeminiKey] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(false);

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/exams/all');
      setExams(res.data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve exams.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGeminiStatus = async () => {
    try {
      const res = await API.get('/exams/settings/gemini');
      setGeminiStatus(res.data);
    } catch (err) {
      console.error('Failed to load Gemini API key status:', err);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchGeminiStatus();
  }, []);

  const handleStartEditExam = (exam) => {
    setEditingExam(exam);
    setEditTitle(exam.title);
    setEditDescription(exam.description);
    setEditDuration(exam.duration);
    setEditStartTime(exam.startTime ? new Date(exam.startTime).toISOString().slice(0, 16) : '');
    setEditEndTime(exam.endTime ? new Date(exam.endTime).toISOString().slice(0, 16) : '');
    setEditMaxWarnings(exam.rules?.maxWarnings || 3);
    setEditInstructions(exam.instructions || '');
  };

  const handleUpdateExamSettings = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      const res = await API.put(`/exams/update/${editingExam._id}`, {
        title: editTitle,
        description: editDescription,
        duration: Number(editDuration),
        startTime: editStartTime,
        endTime: editEndTime,
        instructions: editInstructions,
        rules: { maxWarnings: Number(editMaxWarnings) }
      });
      setSuccess(`Exam settings updated successfully!`);
      setExams(exams.map(exam => exam._id === editingExam._id ? res.data : exam));
      setEditingExam(null);
    } catch (err) {
      setError(err.message || 'Failed to update exam settings.');
    }
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    if (!questionText) {
      setError('Please provide the question text.');
      return;
    }
    if (questionType === 'mcq' && options.some(opt => !opt.text)) {
      setError('Please provide all four option answers.');
      return;
    }

    try {
      setError('');
      const payload = {
        type: questionType,
        question: questionText,
        marks: Number(qMarks),
        difficultyLevel: qDifficulty
      };

      if (questionType === 'mcq') {
        payload.options = options;
        payload.correctAnswer = options.find(opt => opt.isCorrect).text;
      } else if (questionType === 'coding') {
        payload.testCases = testCases.filter(tc => tc.input || tc.expectedOutput);
      }

      const res = await API.put(`/exams/questions/update/${editingQuestion._id}`, payload);

      setSuccess('Question updated successfully!');
      
      // Update local examQuestions state
      setExamQuestions(examQuestions.map(q => q._id === editingQuestion._id ? res.data : q));
      
      // Adjust local exam total marks
      const marksDiff = Number(qMarks) - editingQuestion.marks;
      if (marksDiff !== 0) {
        setExams(exams.map(e => e._id === selectedExam._id ? { ...e, totalMarks: e.totalMarks + marksDiff } : e));
      }

      // Reset question form and exit edit mode
      setEditingQuestion(null);
      setQuestionText('');
      setOptions([
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]);
      setTestCases([{ input: '', expectedOutput: '' }]);
    } catch (err) {
      setError(err.message || 'Failed to update question.');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const targetQuestion = examQuestions.find(q => q._id === questionId);
      const marksToRemove = targetQuestion ? targetQuestion.marks : 0;

      await API.delete(`/exams/questions/delete/${questionId}`);

      setSuccess('Question deleted successfully!');
      setExamQuestions(examQuestions.filter(q => q._id !== questionId));
      
      // Update exam's total marks count locally
      setExams(exams.map(e => e._id === selectedExam._id ? { ...e, totalMarks: Math.max(0, e.totalMarks - marksToRemove) } : e));
      
      // If we were editing this deleted question, exit edit mode
      if (editingQuestion?._id === questionId) {
        setEditingQuestion(null);
        setQuestionText('');
        setOptions([
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ]);
        setTestCases([{ input: '', expectedOutput: '' }]);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete question.');
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!title || !description || !startTime || !endTime) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await API.post('/exams/create', {
        title,
        description,
        examType,
        duration: Number(duration),
        startTime,
        endTime,
        instructions,
        rules: { maxWarnings: Number(maxWarnings) }
      });
      setSuccess(`Exam "${title}" created successfully!`);
      // Reset Form
      setTitle('');
      setDescription('');
      setExamType('both');
      setDuration(60);
      setStartTime('');
      setEndTime('');
      setMaxWarnings(3);
      
      // Refresh & Switch Tab
      fetchExams();
      setActiveTab('list');
    } catch (err) {
      setError(err.message || 'Failed to create exam.');
    }
  };

  const handleDeleteExam = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This deletes all questions permanently!`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await API.delete(`/exams/delete/${id}`);
      setSuccess(`Exam "${name}" deleted.`);
      setExams(exams.filter(exam => exam._id !== id));
      if (selectedExam?._id === id) setSelectedExam(null);
    } catch (err) {
      setError(err.message || 'Failed to delete exam.');
    }
  };

  const handleReconductExam = async (id, name) => {
    if (!window.confirm(`Warning: This will permanently delete all student attempts, scores, and violations for "${name}". Are you sure you want to reconduct this exam?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await API.post(`/exams/reconduct/${id}`);
      setSuccess(res.data.message || `Exam "${name}" reset successfully.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reconduct exam.');
    }
  };

  const handleReconductSelective = async (examId, studentId, studentName) => {
    if (!studentId) {
      alert("Student ID is missing.");
      return;
    }
    if (!window.confirm(`Warning: This will permanently delete the attempt, score, and violations for "${studentName}". Are you sure you want to let them retake the exam?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await API.post(`/exams/reconduct/${examId}`, { studentId });
      setSuccess(res.data.message || `Exam reset successfully for ${studentName}.`);
      handleLoadReports(examId);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reconduct for selected student.');
    }
  };

  const handlePublishToggle = async (exam) => {
    try {
      setError('');
      const updatedExam = await API.put(`/exams/update/${exam._id}`, {
        isPublished: !exam.isPublished
      });
      setExams(exams.map(e => e._id === exam._id ? updatedExam.data : e));
      setSuccess(`Exam "${exam.title}" is now ${!exam.isPublished ? 'PUBLISHED' : 'UNPUBLISHED'}!`);
    } catch (err) {
      setError(err.message || 'Failed to update publication status.');
    }
  };

  // Manage Questions logic
  const handleOpenQuestions = async (exam) => {
    setSelectedExam(exam);
    setQuestionType(exam.examType === 'coding' ? 'coding' : 'mcq');
    setExamQuestions([]);
    setError('');
    try {
      const res = await API.get(`/exams/${exam._id}`);
      setExamQuestions(res.data.questions || []);
    } catch (err) {
      setError(err.message || 'Failed to load questions.');
    }
  };

  const handleOptionChange = (index, value) => {
    const updatedOptions = [...options];
    updatedOptions[index].text = value;
    setOptions(updatedOptions);
  };

  const handleCorrectOptionSelect = (index) => {
    const updatedOptions = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index
    }));
    setOptions(updatedOptions);
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!questionText) {
      setError('Please provide the question text.');
      return;
    }
    if (questionType === 'mcq' && options.some(opt => !opt.text)) {
      setError('Please provide all four option answers.');
      return;
    }

    try {
      setError('');
      const payload = {
        examId: selectedExam._id,
        type: questionType,
        question: questionText,
        marks: Number(qMarks),
        difficultyLevel: qDifficulty
      };

      if (questionType === 'mcq') {
        payload.options = options;
        payload.correctAnswer = options.find(opt => opt.isCorrect).text;
      } else if (questionType === 'coding') {
        payload.testCases = testCases.filter(tc => tc.input || tc.expectedOutput);
      }

      const res = await API.post('/exams/questions/add', payload);

      setSuccess('Question added successfully!');
      setExamQuestions([...examQuestions, res.data]);
      
      // Reset question form
      setQuestionText('');
      setOptions([
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]);
      setTestCases([{ input: '', expectedOutput: '' }]);
      
      // Update local exam score count
      setExams(exams.map(e => e._id === selectedExam._id ? { ...e, totalMarks: e.totalMarks + Number(qMarks) } : e));
    } catch (err) {
      setError(err.message || 'Failed to append question.');
    }
  };

  // Reports logic
  const handleLoadReports = async (examId) => {
    setReportExamId(examId);
    setAttempts([]);
    setLoadingAttempts(true);
    setError('');
    try {
      const res = await API.get(`/attempts/exam/${examId}`);
      setAttempts(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load attempts report.');
    } finally {
      setLoadingAttempts(false);
    }
  };

  const handleDownloadReport = () => {
    if (attempts.length === 0) return;

    const headers = ['Student Name', 'Email', 'Score Obtained', 'Status', 'Suspicion Index', 'Termination Mode', 'Submission Details / Reason', 'Date Taken'];
    
    const rows = attempts.map(att => [
      att.studentId?.fullName || 'N/A',
      att.studentId?.email || 'N/A',
      att.score || 0,
      att.status || 'N/A',
      att.suspicionScore || 0,
      att.autoSubmitted ? 'AI Forced Submission' : 'Manual/Standard',
      att.submissionReason || 'N/A',
      new Date(att.createdAt).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Exam_Report_${reportExamId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Authoring Engine</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Build proctor-monitored exams, curate MCQ items, and analyze student violation logs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => { setActiveTab('list'); setSelectedExam(null); setEditingExam(null); }}
            className={`btn-cyber-secondary ${activeTab === 'list' ? 'glow-text-cyan' : ''}`}
            style={{ 
              borderColor: activeTab === 'list' ? 'var(--primary)' : 'var(--border-color)',
              background: activeTab === 'list' ? 'rgba(14, 165, 233, 0.1)' : 'transparent'
            }}
          >
            <List size={16} />
            My Exams
          </button>
          <button 
            onClick={() => { setActiveTab('create'); setSelectedExam(null); setEditingExam(null); }}
            className={`btn-cyber-secondary ${activeTab === 'create' ? 'glow-text-cyan' : ''}`}
            style={{ 
              borderColor: activeTab === 'create' ? 'var(--primary)' : 'var(--border-color)',
              background: activeTab === 'create' ? 'rgba(14, 165, 233, 0.1)' : 'transparent'
            }}
          >
            <Plus size={16} />
            Create Exam
          </button>
          <button 
            onClick={() => { setActiveTab('settings'); setSelectedExam(null); setEditingExam(null); }}
            className={`btn-cyber-secondary ${activeTab === 'settings' ? 'glow-text-cyan' : ''}`}
            style={{ 
              borderColor: activeTab === 'settings' ? 'var(--primary)' : 'var(--border-color)',
              background: activeTab === 'settings' ? 'rgba(14, 165, 233, 0.1)' : 'transparent'
            }}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Global Alerts */}
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

      {success && (
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
          ✅ {success}
        </div>
      )}

      {/* TAB 1: LIST EXAMS */}
      {activeTab === 'list' && !selectedExam && !editingExam && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Loading authored exams...
            </div>
          ) : exams.length === 0 ? (
            <div className="glass-panel" style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '60px',
              color: 'var(--text-muted)'
            }}>
              <BookOpen size={48} style={{ color: 'var(--primary)', marginBottom: '16px', opacity: 0.7 }} />
              <h4 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600, marginBottom: '6px' }}>
                No Exams Created Yet
              </h4>
              <p style={{ fontSize: '0.95rem', marginBottom: '20px' }}>
                Create your first proctor-locked exam to begin testing students.
              </p>
              <button onClick={() => setActiveTab('create')} className="btn-cyber">
                Create First Exam
              </button>
            </div>
          ) : (
            exams.map((exam) => (
              <div key={exam._id} className="glass-panel-neon" style={{
                padding: '24px',
                background: 'rgba(17, 24, 39, 0.55)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{exam.title}</h3>
                    <button 
                      onClick={() => handlePublishToggle(exam)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      title={exam.isPublished ? 'Unpublish Exam' : 'Publish Exam'}
                    >
                      {exam.isPublished ? (
                        <span className="badge badge-success" style={{ gap: '4px' }}><Eye size={12} /> Published</span>
                      ) : (
                        <span className="badge badge-warning" style={{ gap: '4px' }}><EyeOff size={12} /> Draft</span>
                      )}
                    </button>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '16px', height: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {exam.description}
                  </p>
                  
                  {/* Stats list */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div>⏱️ Duration: <strong>{exam.duration}m</strong></div>
                    <div>⚠️ Warnings Max: <strong>{exam.rules?.maxWarnings || 3}</strong></div>
                    <div>⭐ Marks: <strong>{exam.totalMarks} marks</strong></div>
                    <div style={{ textTransform: 'capitalize' }}>📚 Type: <strong>{exam.examType || 'MCQ'}</strong></div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      onClick={() => handleOpenQuestions(exam)}
                      className="btn-cyber-secondary"
                      style={{ padding: '8px', fontSize: '0.8rem', justifyContent: 'center' }}
                    >
                      <PlusCircle size={14} />
                      Questions
                    </button>
                    <button
                      onClick={() => { setActiveTab('reports'); handleLoadReports(exam._id); }}
                      className="btn-cyber-secondary"
                      style={{ padding: '8px', fontSize: '0.8rem', justifyContent: 'center' }}
                    >
                      <BarChart2 size={14} />
                      Reports
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Link
                      to={`/author/monitor/${exam._id}`}
                      className="btn-cyber"
                      style={{ padding: '8px', fontSize: '0.8rem', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent) 0%, #a21caf 100%)', boxShadow: '0 4px 10px rgba(217,70,239,0.2)' }}
                    >
                      <Play size={14} />
                      Monitor Live
                    </Link>
                    <button
                      onClick={() => handleReconductExam(exam._id, exam.title)}
                      className="btn-cyber-secondary"
                      style={{ padding: '8px', fontSize: '0.8rem', justifyContent: 'center', borderColor: 'var(--warning)', color: 'var(--warning)', background: 'rgba(234,179,8,0.05)' }}
                    >
                      <RefreshCw size={14} />
                      Reconduct
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      onClick={() => handleStartEditExam(exam)}
                      className="btn-cyber-secondary"
                      style={{ padding: '8px', fontSize: '0.8rem', justifyContent: 'center', borderColor: 'var(--primary)', color: 'var(--primary)', background: 'rgba(14,165,233,0.05)' }}
                    >
                      ✏️ Edit Settings
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam._id, exam.title)}
                      className="btn-cyber-danger"
                      style={{ padding: '8px', fontSize: '0.8rem', justifyContent: 'center' }}
                    >
                      <Trash size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* EDIT EXAM SETTINGS */}
      {activeTab === 'list' && !selectedExam && editingExam && (
        <div className="glass-panel" style={{ padding: '36px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>✏️</span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Edit Exam Settings</h2>
            </div>
            <button 
              onClick={() => setEditingExam(null)} 
              className="btn-cyber-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleUpdateExamSettings}>
            <div style={{ marginBottom: '20px' }}>
              <label className="label-cyber">EXAM TITLE *</label>
              <input
                type="text"
                className="input-cyber"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="label-cyber">DESCRIPTION / SYLLABUS *</label>
              <textarea
                className="input-cyber"
                style={{ minHeight: '100px', resize: 'vertical' }}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                required
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div>
                <label className="label-cyber">DURATION (MINUTES) *</label>
                <input
                  type="number"
                  className="input-cyber"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  min="5"
                  required
                />
              </div>
              <div>
                <label className="label-cyber">MAX WARN TOLERANCE *</label>
                <input
                  type="number"
                  className="input-cyber"
                  value={editMaxWarnings}
                  onChange={(e) => setEditMaxWarnings(e.target.value)}
                  min="1"
                  max="10"
                  required
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div>
                <label className="label-cyber">START TIME *</label>
                <input
                  type="datetime-local"
                  className="input-cyber"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label-cyber">END TIME *</label>
                <input
                  type="datetime-local"
                  className="input-cyber"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label className="label-cyber">STUDENT PORTAL INSTRUCTIONS</label>
              <textarea
                className="input-cyber"
                style={{ minHeight: '100px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }}
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-cyber"
              style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
            >
              Update Exam Settings
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: CREATE EXAM FORM */}
      {activeTab === 'create' && (
        <div className="glass-panel" style={{ padding: '36px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <FileText size={22} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Curate Proctor-Locked Exam</h2>
          </div>

          <form onSubmit={handleCreateExam}>
            <div style={{ marginBottom: '20px' }}>
              <label className="label-cyber">EXAM TITLE *</label>
              <input
                type="text"
                placeholder="e.g. JavaScript Core Validation"
                className="input-cyber"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="label-cyber">DESCRIPTION / SYLLABUS *</label>
              <textarea
                placeholder="Details about the exam scope..."
                className="input-cyber"
                style={{ minHeight: '100px', resize: 'vertical' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div>
                <label className="label-cyber">DURATION (MINUTES) *</label>
                <input
                  type="number"
                  className="input-cyber"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="5"
                  required
                />
              </div>
              <div>
                <label className="label-cyber">MAX WARN TOLERANCE *</label>
                <input
                  type="number"
                  className="input-cyber"
                  value={maxWarnings}
                  onChange={(e) => setMaxWarnings(e.target.value)}
                  min="1"
                  max="10"
                  required
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div>
                <label className="label-cyber">START TIME *</label>
                <input
                  type="datetime-local"
                  className="input-cyber"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label-cyber">END TIME *</label>
                <input
                  type="datetime-local"
                  className="input-cyber"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label className="label-cyber">STUDENT PORTAL INSTRUCTIONS</label>
              <textarea
                className="input-cyber"
                style={{ minHeight: '100px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-cyber"
              style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
            >
              <PlusSquare size={18} />
              Author and Deploy Exam Draft
            </button>
          </form>
        </div>
      )}

      {/* MANAGE QUESTIONS SUB-VIEW */}
      {selectedExam && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '30px' }}>
          {/* Left panel: Add Question Form */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>Selected: {selectedExam.title}</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '4px' }}>
                  {editingQuestion ? '✏️ Edit Question Item' : 'Add Question Item'}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {editingQuestion && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingQuestion(null);
                      setQuestionText('');
                      setOptions([
                        { text: '', isCorrect: true },
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false }
                      ]);
                      setTestCases([{ input: '', expectedOutput: '' }]);
                    }}
                    className="btn-cyber-secondary" 
                    style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                  >
                    Cancel Edit
                  </button>
                )}
                <button 
                  onClick={() => { setSelectedExam(null); setEditingQuestion(null); }} 
                  className="btn-cyber-secondary" 
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  Back to Exams
                </button>
              </div>
            </div>

            <form onSubmit={editingQuestion ? handleUpdateQuestion : handleAddQuestion}>
              {selectedExam.examType === 'both' && (
                <div style={{ marginBottom: '16px' }}>
                  <label className="label-cyber">QUESTION TYPE</label>
                  <select 
                    className="input-cyber" 
                    value={questionType} 
                    onChange={(e) => setQuestionType(e.target.value)}
                    style={{ background: 'var(--bg-main)' }}
                  >
                    <option value="mcq">MCQ Question</option>
                    <option value="coding">Coding Question</option>
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label className="label-cyber">QUESTION STATEMENT / PROBLEM DESCRIPTION *</label>
                <textarea
                  placeholder={questionType === 'coding' ? "Describe the coding problem, constraints, etc." : "e.g. Which of the following is correct about Javascript lexical environment?"}
                  className="input-cyber"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  required
                />
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '20px'
              }}>
                <div>
                  <label className="label-cyber">SCORE WEIGHT (MARKS) *</label>
                  <input
                    type="number"
                    className="input-cyber"
                    value={qMarks}
                    onChange={(e) => setQMarks(e.target.value)}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="label-cyber">DIFFICULTY LEVEL</label>
                  <select 
                    className="input-cyber" 
                    value={qDifficulty} 
                    onChange={(e) => setQDifficulty(e.target.value)}
                    style={{ background: 'var(--bg-main)' }}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Options curating */}
              {questionType === 'mcq' && (
                <div style={{ marginBottom: '24px' }}>
                  <label className="label-cyber" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>MCQ CHANNELS (PROVIDE ALL 4 OPTIONS) *</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Check Correct Channel</span>
                  </label>
                  
                  {options.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{
                        color: 'var(--text-muted)',
                        fontFamily: 'monospace',
                        fontWeight: 700
                      }}>
                        Option {String.fromCharCode(65 + i)}:
                      </div>
                      <input
                        type="text"
                        placeholder={`Provide option text...`}
                        className="input-cyber"
                        value={opt.text}
                        onChange={(e) => handleOptionChange(i, e.target.value)}
                        required
                      />
                      <input
                        type="radio"
                        name="correct-option"
                        checked={opt.isCorrect}
                        onChange={() => handleCorrectOptionSelect(i)}
                        style={{
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          accentColor: 'var(--success)'
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Coding Test Cases */}
              {questionType === 'coding' && (
                <div style={{ marginBottom: '24px' }}>
                  <label className="label-cyber" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>TEST CASES (Optional but Recommended for AI Evaluation)</span>
                  </label>
                  
                  {testCases.map((tc, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <input
                        type="text"
                        placeholder="Input (e.g. [1, 2, 3])"
                        className="input-cyber"
                        value={tc.input}
                        onChange={(e) => {
                          const newTC = [...testCases];
                          newTC[i].input = e.target.value;
                          setTestCases(newTC);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Expected Output (e.g. 6)"
                        className="input-cyber"
                        value={tc.expectedOutput}
                        onChange={(e) => {
                          const newTC = [...testCases];
                          newTC[i].expectedOutput = e.target.value;
                          setTestCases(newTC);
                        }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTestCases([...testCases, { input: '', expectedOutput: '' }])}
                    className="btn-cyber-secondary"
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                  >
                    + Add Test Case
                  </button>
                </div>
              )}

              <button type="submit" className="btn-cyber" style={{ width: '100%', justifyContent: 'center' }}>
                <PlusCircle size={16} />
                {editingQuestion ? 'Update Question' : 'Save & Append Question'}
              </button>
            </form>
          </div>

          {/* Right panel: Questions Queue */}
          <div className="glass-panel" style={{ padding: '28px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Questions Queue</span>
              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{examQuestions.length} Items</span>
            </h3>

            {examQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No questions exist in this exam yet. Use the left panel to add items.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
                {examQuestions.map((q, qidx) => (
                  <div key={q._id || qidx} className="glass-panel" style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.01)',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 700 }}>
                      <span style={{ color: 'var(--primary)' }}>Q{qidx + 1} ({q.marks} pts)</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className={`badge ${
                          q.difficultyLevel === 'hard' ? 'badge-danger' :
                          q.difficultyLevel === 'medium' ? 'badge-warning' : 'badge-success'
                        }`} style={{ fontSize: '0.55rem', padding: '1px 5px' }}>
                          {q.difficultyLevel}
                        </span>
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingQuestion(q);
                            setQuestionType(q.type);
                            setQuestionText(q.question);
                            setQDifficulty(q.difficultyLevel);
                            setQMarks(q.marks);
                            if (q.type === 'mcq') {
                              setOptions(q.options || [
                                { text: '', isCorrect: true },
                                { text: '', isCorrect: false },
                                { text: '', isCorrect: false },
                                { text: '', isCorrect: false }
                              ]);
                            } else if (q.type === 'coding') {
                              setTestCases(q.testCases || [{ input: '', expectedOutput: '' }]);
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: 'var(--primary)',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Edit Question"
                        >
                          ✏️
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteQuestion(q._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: 'var(--danger)',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Delete Question"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div style={{ color: '#fff', marginBottom: '10px', fontWeight: 600 }}>{q.question}</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {q.type === 'mcq' && q.options && q.options.map((opt, oidx) => (
                        <div key={oidx} style={{
                          padding: '6px 10px',
                          borderRadius: '4px',
                          background: opt.isCorrect ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                          border: opt.isCorrect ? '1px solid rgba(16,185,129,0.2)' : '1px solid var(--border-color)',
                          color: opt.isCorrect ? 'var(--success)' : 'var(--text-muted)',
                          fontSize: '0.75rem',
                          fontWeight: opt.isCorrect ? 700 : 400
                        }}>
                          {String.fromCharCode(65 + oidx)}: {opt.text} {opt.isCorrect && '✓'}
                        </div>
                      ))}
                      {q.type === 'coding' && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Code problem. {q.testCases?.length || 0} Test Cases Provided.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REPORTS */}
      {activeTab === 'reports' && !selectedExam && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart2 size={20} style={{ color: 'var(--accent)' }} />
              Student Performance & Proctoring Reports
            </h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                className="input-cyber"
                value={reportExamId}
                onChange={(e) => handleLoadReports(e.target.value)}
                style={{ maxWidth: '280px', background: 'var(--bg-main)' }}
              >
                <option value="">-- Choose Exam to load Reports --</option>
                {exams.map(e => (
                  <option key={e._id} value={e._id}>{e.title}</option>
                ))}
              </select>
              {reportExamId && attempts.length > 0 && (
                <button onClick={handleDownloadReport} className="btn-cyber">
                  <Download size={16} />
                  Download CSV
                </button>
              )}
            </div>
          </div>

          {!reportExamId ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Choose an exam from the selector above to populate student participation records and proctoring stats.
            </div>
          ) : loadingAttempts ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Compiling attempt analytics...
            </div>
          ) : attempts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              No student attempts registered for this exam yet.
            </div>
          ) : (
            <div className="cyber-table-container">
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Score Obtained</th>
                    <th>Status</th>
                    <th>Suspicion Index</th>
                    <th>Termination Mode</th>
                    <th>Submission Reason</th>
                    <th>Date Taken</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((att) => (
                    <tr key={att._id}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{att.studentId?.fullName}</td>
                      <td>{att.studentId?.email}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{att.score} marks</td>
                      <td>
                        <span className={`badge ${
                          att.status === 'submitted' ? 'badge-success' :
                          att.status === 'terminated' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {att.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontWeight: 700,
                            color: att.suspicionScore >= 50 ? 'var(--danger)' : 
                                   att.suspicionScore >= 20 ? 'var(--warning)' : 'var(--success)'
                          }}>
                            {att.suspicionScore} pts
                          </span>
                          <div style={{
                            width: '60px',
                            height: '6px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.min(att.suspicionScore, 100)}%`,
                              height: '100%',
                              background: att.suspicionScore >= 50 ? 'var(--danger)' : 
                                         att.suspicionScore >= 20 ? 'var(--warning)' : 'var(--success)'
                            }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        {att.autoSubmitted ? (
                          <span className="badge badge-danger">AI Forced Submission</span>
                        ) : (
                          <span className="badge badge-success">Manual/Standard</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: att.autoSubmitted ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {att.submissionReason || 'N/A'}
                      </td>
                      <td>{new Date(att.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => handleReconductSelective(reportExamId, att.studentId?._id, att.studentId?.fullName)}
                          className="btn-cyber-secondary"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            borderColor: 'var(--warning)',
                            color: 'var(--warning)',
                            background: 'rgba(234,179,8,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <RefreshCw size={12} />
                          Reconduct
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="glass-panel" style={{ padding: '36px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚙️</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>AI Proctor & Evaluation Settings</h2>
          </div>

          <div style={{
            background: 'rgba(14, 165, 233, 0.05)',
            border: '1px solid rgba(14, 165, 233, 0.2)',
            padding: '16px 20px',
            borderRadius: '12px',
            marginBottom: '28px',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            color: 'var(--text-muted)'
          }}>
            ℹ️ <strong>Gemini AI Code Evaluation</strong> allows automated assessment of student coding submissions. You can configure your own <strong>Gemini API Key</strong> below to activate AI code grading.
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>Current Key Status</h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              padding: '12px 16px',
              borderRadius: '8px',
            }}>
              <div>
                <span className={`badge ${geminiStatus.isConfigured ? 'badge-success' : 'badge-danger'}`} style={{ marginRight: '10px' }}>
                  {geminiStatus.isConfigured ? 'ACTIVE' : 'INACTIVE'}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {geminiStatus.maskedKey || 'No Gemini API key configured.'}
                </span>
              </div>
              {geminiStatus.isConfigured && (
                <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                  Source: {geminiStatus.source === 'env' ? 'Environment Variable (.env)' : 'Database Settings'}
                </span>
              )}
            </div>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!newGeminiKey) return;
            try {
              setLoadingSettings(true);
              setError('');
              setSuccess('');
              const res = await API.post('/exams/settings/gemini', { apiKey: newGeminiKey });
              setSuccess(res.data.message || 'Gemini API Key saved successfully.');
              setNewGeminiKey('');
              await fetchGeminiStatus();
            } catch (err) {
              setError(err.response?.data?.message || err.message || 'Failed to update Gemini API key.');
            } finally {
              setLoadingSettings(false);
            }
          }}>
            <div style={{ marginBottom: '20px' }}>
              <label className="label-cyber">UPDATE GEMINI API KEY</label>
              <input
                type="password"
                placeholder="Enter Gemini API Key (AIzaSy...)"
                className="input-cyber"
                value={newGeminiKey}
                onChange={(e) => setNewGeminiKey(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-cyber"
              disabled={loadingSettings}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loadingSettings ? 'Saving API Key...' : 'Save Gemini API Key'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AuthorDashboard;
