import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Check for an existing authenticated session on application mount
   */
  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authApi.getCurrentUser();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      // 401 simply means no active session; not an unexpected error
      setUser(null);
      if (err.status && err.status !== 401) {
        setError(err.message || 'Session verification failed');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /**
   * Login with email and password
   */
  const login = async ({ email, password }) => {
    setError(null);
    const res = await authApi.loginUser({ email, password });
    if (res.success && res.data?.user) {
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error('Authentication response missing user payload');
  };

  /**
   * Register a new account and automatically establish a session
   */
  const register = async ({ email, password }) => {
    setError(null);
    // 1. Create account
    const regRes = await authApi.registerUser({ email, password });
    if (!regRes.success) {
      throw new Error(regRes.error?.message || 'Registration failed');
    }

    // 2. Establish session
    return await login({ email, password });
  };

  /**
   * Terminate active session
   */
  const logout = async () => {
    try {
      await authApi.logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setError(null);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    register,
    logout,
    checkSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
