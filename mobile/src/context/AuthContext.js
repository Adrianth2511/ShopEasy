import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken } from '../config/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // null = not yet determined, false = logged out, string = logged in
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Called once on app start to restore session
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userStr = await AsyncStorage.getItem('userInfo');

      if (!token || !userStr) {
        // No saved session
        setIsLoading(false);
        return;
      }

      // Validate the saved token against the backend
      const res = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        // Token is still valid — restore session
        setAuthToken(token);  // Set in-memory immediately
        setUserToken(token);
        setUserInfo(JSON.parse(userStr));
      } else {
        // Token rejected — clear it
        await clearStorage();
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 400) {
        // Bad/expired token — clear and show login
        console.log('[Auth] Stale token cleared');
        await clearStorage();
      } else {
        // Network/server error — restore session from cache so user stays logged in offline
        console.log('[Auth] Network error, restoring cached session');
        try {
          const token = await AsyncStorage.getItem('userToken');
          const userStr = await AsyncStorage.getItem('userInfo');
          if (token && userStr) {
            setAuthToken(token);  // Set in-memory immediately
            setUserToken(token);
            setUserInfo(JSON.parse(userStr));
          }
        } catch (_) {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearStorage = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userInfo');
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, ...user } = res.data;
    setAuthToken(token);  // Set immediately before any other calls
    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('userInfo', JSON.stringify(user));
    setUserInfo(user);
    setUserToken(token);
  };

  const register = async (name, email, password, phone) => {
    const res = await api.post('/auth/register', { name, email, password, phone });
    const { token, ...user } = res.data;
    setAuthToken(token);  // Set immediately before any other calls
    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('userInfo', JSON.stringify(user));
    setUserInfo(user);
    setUserToken(token);
  };

  const logout = async () => {
    setAuthToken(null);  // Clear in-memory token immediately
    await clearStorage();
    setUserToken(null);
    setUserInfo(null);
  };

  return (
    <AuthContext.Provider value={{ login, register, logout, isLoading, userToken, userInfo }}>
      {children}
    </AuthContext.Provider>
  );
};
