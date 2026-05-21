import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('trinetra_token');
  const userString = localStorage.getItem('trinetra_user');
  
  if (!token || !userString) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userString);
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // If role not allowed, redirect to correct landing page
      if (user.role === 'admin') return <Navigate to="/admin" replace />;
      if (user.role === 'author') return <Navigate to="/author" replace />;
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  } catch (error) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
