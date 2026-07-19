import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('spotchat_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      setUser(data);
      localStorage.setItem('spotchat_user', JSON.stringify(data));
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, avatar, status) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.post('/auth/register', {
        name,
        email,
        password,
        avatar,
        status,
      });
      setUser(data);
      localStorage.setItem('spotchat_user', JSON.stringify(data));
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('spotchat_user');
  };

  const updateProfile = async (profileData, socket) => {
    try {
      const { data } = await API.put('/auth/profile', profileData);
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('spotchat_user', JSON.stringify(updatedUser));
      if (socket) {
        socket.emit('update_profile', data);
      }
      return updatedUser;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
