import axios from 'axios';
import { getToken } from './auth';

const isServer = typeof window === 'undefined';
// En producción, Vercel usará NEXT_PUBLIC_API_URL. En local Docker usa API_URL.
const baseURL = process.env.NEXT_PUBLIC_API_URL || 
                (isServer ? (process.env.API_URL || 'http://backend:3001') : 'http://localhost:3001');

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {

      if (error.config.url?.includes('/auth/login')) {
        return Promise.reject(error);
      }

      localStorage.removeItem('token');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
