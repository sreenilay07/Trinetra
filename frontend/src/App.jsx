import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import AuthorDashboard from './pages/AuthorDashboard';
import LiveExamMonitor from './pages/LiveExamMonitor';
import StudentDashboard from './pages/StudentDashboard';
import ExamPortal from './pages/ExamPortal';
import ExamResult from './pages/ExamResult';

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ flex: 1 }}>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Admin Dashboard */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Author Dashboard */}
            <Route
              path="/author"
              element={
                <ProtectedRoute allowedRoles={['author', 'admin']}>
                  <AuthorDashboard />
                </ProtectedRoute>
              }
            />

            {/* Real-time Proctoring Monitor */}
            <Route
              path="/author/monitor/:examId"
              element={
                <ProtectedRoute allowedRoles={['author', 'admin']}>
                  <LiveExamMonitor />
                </ProtectedRoute>
              }
            />

            {/* Student Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Secured Proctor Sandbox (Exam Taking Portal) */}
            <Route
              path="/exam-portal/:examId/:attemptId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <ExamPortal />
                </ProtectedRoute>
              }
            />

            {/* Exam Results Receipt */}
            <Route
              path="/exam-result/:attemptId"
              element={
                <ProtectedRoute allowedRoles={['student', 'author', 'admin']}>
                  <ExamResult />
                </ProtectedRoute>
              }
            />

            {/* Fallback routing */}
            <Route
              path="*"
              element={
                <Navigate to="/login" replace />
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
