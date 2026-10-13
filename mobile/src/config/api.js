import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api',
});

// Set token synchronously in memory (no async delay on every request)
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// On app startup, initialize token from storage
AsyncStorage.getItem('userToken').then((token) => {
  if (token) setAuthToken(token);
}).catch(() => {});

export default api;
