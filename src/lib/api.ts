import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  // Priority: workerToken (for PIN login) > token (for firm login)
  // Workers use their ID as token, firm login uses Supabase JWT
  const workerToken = localStorage.getItem('workerToken');
  const token = localStorage.getItem('token');
  
  if (workerToken) {
    // Use worker ID as token for PIN-authenticated workers
    config.headers.Authorization = `Bearer ${workerToken}`;
  } else if (token) {
    // Use Supabase JWT for firm login
    config.headers.Authorization = `Bearer ${token}`;
  }
  // If neither token exists, the request will fail with 401 (which is expected)
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't show toast for login/register/verify-pin errors - let the component handle it
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                          error.config?.url?.includes('/auth/register') ||
                          error.config?.url?.includes('/auth/verify-pin');
    
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Only redirect if not already on login page or worker-selection page
      // Also check if we have a currentWorker - if yes, don't redirect (might be a temporary API issue)
      const currentPath = window.location.pathname;
      const hasCurrentWorker = localStorage.getItem('currentWorker');
      
      if (currentPath !== '/login' && currentPath !== '/worker-selection' && !hasCurrentWorker) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentWorker');
        toast.error('Sitzung abgelaufen. Bitte erneut anmelden.', {
          duration: 5000,
        });
        window.location.href = '/login';
      } else if (currentPath !== '/login' && currentPath !== '/worker-selection' && hasCurrentWorker) {
        // If we have a worker but get 401, it might be a token issue
        // Don't redirect immediately, just log the error
        console.warn('401 error but worker is logged in. Token might be expired.');
      }
    } else if (!isAuthEndpoint) {
      // Only show global error toast for non-auth endpoints
      if (error.response?.data?.message) {
        toast.error(error.response.data.message, {
          duration: 5000,
        });
      } else if (!error.response) {
        toast.error('Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.', {
          duration: 6000,
        });
      } else {
        toast.error('Ein Fehler ist aufgetreten', {
          duration: 5000,
        });
      }
    }
    return Promise.reject(error);
  }
);

export default api;

