import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
