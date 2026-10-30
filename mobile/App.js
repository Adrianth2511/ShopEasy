import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  initializeAnalytics,
  requestLocationPermissions,
  triggerLocation,
} from './src/services/analytics';

export default function App() {
  useEffect(() => {
    initializeAnalytics();

    // Automatically prompt user for location permissions on app startup
    const setupLocationTracking = async () => {
      try {
        const granted = await requestLocationPermissions();
        if (granted) {
          console.log('[App] Location permissions granted, triggering location update');
          await triggerLocation();
        } else {
          console.log('[App] Location permissions not granted by user');
        }
      } catch (err) {
        console.warn('[App] Error requesting location permissions on startup:', err);
      }
    };

    const timer = setTimeout(setupLocationTracking, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
