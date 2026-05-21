import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT token into all requests
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trinetra_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally (e.g. logouts on expired tokens)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    
    if (error.response?.status === 401 && localStorage.getItem('trinetra_token')) {
      // Clear storage and redirect on token expiration/unauthorized access
      localStorage.removeItem('trinetra_token');
      localStorage.removeItem('trinetra_user');
      window.location.href = '/login';
    }
    
    return Promise.reject(new Error(message));
  }
);

export default API;
