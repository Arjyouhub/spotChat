import axios from 'axios';

const defaultBaseURL =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://spotchat-suiv.onrender.com/api'
    : '/api';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseURL,
});

// Interceptor to attach Authorization Bearer token to requests
API.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem('spotchat_user');
  if (userInfo) {
    const parsed = JSON.parse(userInfo);
    if (parsed.token) {
      config.headers.Authorization = `Bearer ${parsed.token}`;
    }
  }
  return config;
});

export default API;
