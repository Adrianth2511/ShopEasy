import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid, Alert } from 'react-native';

const { CleverTapGeofence } = NativeModules;
const geofenceEmitter = CleverTapGeofence ? new NativeEventEmitter(CleverTapGeofence) : null;

/**
 * Checks whether runtime location permissions are granted on Android.
 * @returns {Promise<{ fineLocation: boolean, coarseLocation: boolean, backgroundLocation: boolean }>}
 */
export const checkLocationPermissions = async () => {
  if (Platform.OS !== 'android') {
    return { fineLocation: true, coarseLocation: true, backgroundLocation: true };
  }

  try {
    const fine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    const coarse = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
    let bg = true;
    if (Platform.Version >= 29) {
      bg = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
    }
    return {
      fineLocation: fine,
      coarseLocation: coarse,
      backgroundLocation: bg,
      isFullyGranted: fine && bg,
    };
  } catch (error) {
    console.error('[CleverTap Geofence] Error checking location permissions:', error);
    return { fineLocation: false, coarseLocation: false, backgroundLocation: false, isFullyGranted: false };
  }
};

/**
 * Requests location permissions following Android guidelines:
 * 1. Prompts for foreground permissions (FINE & COARSE) first (required for Android 12+).
 * 2. If granted, prompts for background location on Android 10+ (API 29+) so geofencing works when app is closed.
 *
 * @returns {Promise<boolean>} Whether permissions are granted
 */
export const requestLocationPermissions = async () => {
  if (Platform.OS !== 'android') {
    console.log('[CleverTap Geofence] Location permission requested on non-Android platform');
    return true;
  }

  try {
    // 1. Foreground Location permissions (Fine + Coarse)
    const userResponse = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);

    const fineGranted = userResponse[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
    const coarseGranted = userResponse[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

    if (!fineGranted && !coarseGranted) {
      console.warn('[CleverTap Geofence] Foreground location permission was denied');
      return false;
    }

    console.log('[CleverTap Geofence] Foreground location permissions granted');

    // 2. Background Location (Android 10 / API 29+)
    // Note: Android requires requesting foreground first before requesting background.
    if (Platform.Version >= 29) {
      const isBgGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
      );

      if (!isBgGranted) {
        const bgResponse = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: 'Background Location Permission',
            message:
              'ShopEasy needs background location access to send you special offers and geofence alerts when you are near our stores even when the app is closed.',
            buttonPositive: 'Allow all the time',
            buttonNegative: 'Only while using app',
          }
        );

        if (bgResponse === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('[CleverTap Geofence] Background location permission granted');
        } else {
          console.warn('[CleverTap Geofence] Background location permission denied or limited to foreground');
        }
      }
    }

    return true;
  } catch (error) {
    console.error('[CleverTap Geofence] Error requesting location permissions:', error);
    return false;
  }
};

/**
 * Initializes the CleverTap Geofence SDK with custom or default settings.
 *
 * Available settings:
 * - bgLocation (boolean, default true): Enable background location updates
 * - accuracy (number, default 1 = HIGH): Location accuracy
 * - fetchMode (number, default 1 = PERIODIC): Location fetch mode
 * - geofenceCount (number, default 50): Max number of geofences to monitor
 * - interval (number, default 1800000 ms / 30 mins): Interval for location fetch
 * - fastestInterval (number, default 1800000 ms): Fastest interval
 * - smallestDisplacement (number, default 200 meters): Min displacement in meters
 * - geofenceNotificationResponsiveness (number, default 0 ms): Notification responsiveness
 *
 * @param {object} customSettings
 * @returns {Promise<boolean>}
 */
export const initGeofence = async (customSettings = {}) => {
  if (Platform.OS !== 'android') {
    console.log('[CleverTap Geofence] initGeofence is only supported on Android native');
    return false;
  }

  if (!CleverTapGeofence?.initGeofence) {
    console.warn('[CleverTap Geofence] CleverTapGeofence native module is not available');
    return false;
  }

  const defaultSettings = {
    bgLocation: true,
    logLevel: 3, // Verbose
    accuracy: 1, // High Accuracy
    fetchMode: 1, // Periodic
    geofenceCount: 50,
    interval: 1800000, // 30 minutes
    fastestInterval: 1800000,
    smallestDisplacement: 200, // 200 meters
    geofenceNotificationResponsiveness: 0,
    ...customSettings,
  };

  try {
    const result = await CleverTapGeofence.initGeofence(defaultSettings);
    console.log('[CleverTap Geofence] Initialized successfully:', result);
    return true;
  } catch (error) {
    console.error('[CleverTap Geofence] Failed to initialize:', error);
    return false;
  }
};

/**
 * Triggers an immediate, high-accuracy location fetch from the OS, reverse-geocodes it,
 * syncs to CleverTap profile & triggers event flush, and notifies listeners.
 *
 * @returns {Promise<{ success: boolean, latitude?: number, longitude?: number, city?: string, country?: string, message?: string }>}
 */
export const triggerLocation = async () => {
  if (Platform.OS !== 'android') {
    return { success: false, message: 'Platform is not Android' };
  }

  if (!CleverTapGeofence?.triggerLocation) {
    console.warn('[CleverTap Geofence] Native module triggerLocation is not available');
    return { success: false, message: 'CleverTapGeofence module not found' };
  }

  try {
    const result = await CleverTapGeofence.triggerLocation();
    console.log('[CleverTap Geofence] triggerLocation result:', result);
    return result || { success: true };
  } catch (error) {
    console.warn('[CleverTap Geofence] triggerLocation failed:', error?.message || error);
    return { success: false, message: error?.message || String(error) };
  }
};

/**
 * Manually sets coordinates, reverse-geocodes, and updates the CleverTap profile.
 * Useful for simulating store proximity or testing without waiting for physical GPS lock.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{ success: boolean, latitude: number, longitude: number, city?: string, country?: string }>}
 */
export const setManualLocation = async (latitude, longitude) => {
  if (Platform.OS !== 'android') {
    return { success: false, message: 'Platform is not Android' };
  }

  if (!CleverTapGeofence?.setLocation) {
    console.warn('[CleverTap Geofence] Native module setLocation is not available');
    return { success: false, message: 'CleverTapGeofence module not found' };
  }

  try {
    const result = await CleverTapGeofence.setLocation(latitude, longitude);
    console.log('[CleverTap Geofence] setManualLocation result:', result);
    return result || { success: true, latitude, longitude };
  } catch (error) {
    console.error('[CleverTap Geofence] setManualLocation failed:', error);
    return { success: false, message: error?.message || String(error) };
  }
};

/**
 * Checks whether CleverTap Geofence SDK has been initialized.
 * @returns {Promise<boolean>}
 */
export const isGeofenceInitialized = async () => {
  if (Platform.OS !== 'android' || !CleverTapGeofence?.isInitialized) {
    return false;
  }
  try {
    return await CleverTapGeofence.isInitialized();
  } catch {
    return false;
  }
};

/**
 * Listens for Geofence API Initialized callback.
 * @param {Function} callback - () => void
 * @returns {Function} unsubscribe function
 */
export const onGeofenceInitialized = (callback) => {
  if (!geofenceEmitter || typeof callback !== 'function') return () => {};
  const subscription = geofenceEmitter.addListener('CleverTapGeofenceInitialized', callback);
  return () => subscription.remove();
};

/**
 * Listens for Geofence Entered event.
 * Triggered automatically when user enters a geofence cluster configured in CleverTap dashboard.
 *
 * Payload structure:
 * {
 *   id: number,            // geofenceUniqueID
 *   gcId: number,          // geofenceClusterId
 *   gcName: string,        // geofenceClusterName
 *   lat: number,           // geofence Latitude
 *   lng: number,           // geofence Longitude
 *   r: number,             // geofence Radius in meters
 *   triggered_lat: number, // geofence Triggered Latitude
 *   triggered_lng: number  // geofence Triggered Longitude
 * }
 *
 * @param {Function} callback - (geofenceData) => void
 * @returns {Function} unsubscribe function
 */
export const onGeofenceEntered = (callback) => {
  if (!geofenceEmitter || typeof callback !== 'function') return () => {};
  const subscription = geofenceEmitter.addListener('CleverTapGeofenceEntered', (data) => {
    console.log('[CleverTap Geofence] Entered cluster:', data);
    callback(data);
  });
  return () => subscription.remove();
};

/**
 * Listens for Geofence Exited event.
 * Triggered automatically when user exits a geofence cluster configured in CleverTap dashboard.
 *
 * @param {Function} callback - (geofenceData) => void
 * @returns {Function} unsubscribe function
 */
export const onGeofenceExited = (callback) => {
  if (!geofenceEmitter || typeof callback !== 'function') return () => {};
  const subscription = geofenceEmitter.addListener('CleverTapGeofenceExited', (data) => {
    console.log('[CleverTap Geofence] Exited cluster:', data);
    callback(data);
  });
  return () => subscription.remove();
};

/**
 * Listens for OS Location Updates delivered to CleverTap Geofence SDK.
 *
 * Payload structure:
 * {
 *   latitude: number,
 *   longitude: number,
 *   accuracy: number,
 *   altitude: number,
 *   speed: number,
 *   bearing: number,
 *   time: number
 * }
 *
 * @param {Function} callback - (locationData) => void
 * @returns {Function} unsubscribe function
 */
export const onLocationUpdates = (callback) => {
  if (!geofenceEmitter || typeof callback !== 'function') return () => {};
  const subscription = geofenceEmitter.addListener('CleverTapLocationUpdates', (loc) => {
    console.log('[CleverTap Geofence] Location update:', loc);
    callback(loc);
  });
  return () => subscription.remove();
};
