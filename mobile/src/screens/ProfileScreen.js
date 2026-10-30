import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import {
  showAppInbox,
  promptPushPrimer,
  getCleverTapID,
} from '../services/analytics';
import {
  requestLocationPermissions,
  triggerLocation,
  checkLocationPermissions,
  setManualLocation,
  onLocationUpdates,
} from '../services/geofence';

export default function ProfileScreen({ navigation }) {
  const { userInfo, logout } = useContext(AuthContext);
  const [cleverTapId, setCleverTapId] = useState(null);
  const [locationInfo, setLocationInfo] = useState(null);
  const [syncingLocation, setSyncingLocation] = useState(false);

  useEffect(() => {
    getCleverTapID((err, id) => {
      if (!err && id) {
        setCleverTapId(id);
      }
    });

    const unsubscribe = onLocationUpdates((loc) => {
      if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        setLocationInfo({
          latitude: loc.latitude,
          longitude: loc.longitude,
          city: loc.city || '',
          country: loc.country || '',
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleSyncLiveGPS = async () => {
    setSyncingLocation(true);
    try {
      const result = await triggerLocation();
      setSyncingLocation(false);
      if (result?.success && typeof result.latitude === 'number') {
        setLocationInfo({
          latitude: result.latitude,
          longitude: result.longitude,
          city: result.city || '',
          country: result.country || '',
        });
        Alert.alert(
          'Location Synced to CleverTap! 🎯',
          `📍 City: ${result.city || 'Detected'}\n🌍 Country: ${result.country || 'Detected'}\n📐 Latitude: ${result.latitude.toFixed(4)}\n📐 Longitude: ${result.longitude.toFixed(4)}\n\nYour user profile on the CleverTap dashboard is now updated!`
        );
      } else {
        Alert.alert(
          'GPS Fix Pending',
          result?.message || 'Device location fix is still pending. Make sure GPS / Location is turned on in Android settings, or use "Set Test Location" below.'
        );
      }
    } catch (err) {
      setSyncingLocation(false);
      Alert.alert('Error', err?.message || 'Failed to sync location');
    }
  };

  const handleSetTestLocation = () => {
    Alert.alert(
      'Choose Test Store Location',
      'Select a location to immediately push to CleverTap profile & test geofencing:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '🇬🇧 London (51.5074, -0.1278)',
          onPress: async () => {
            const res = await setManualLocation(51.5074, -0.1278);
            if (res?.success) {
              setLocationInfo({ latitude: 51.5074, longitude: -0.1278, city: res.city || 'London', country: res.country || 'United Kingdom' });
              Alert.alert('Location Updated', 'Set to London, UK! Synced to CleverTap profile.');
            }
          },
        },
        {
          text: '🇮🇳 Mumbai (19.0760, 72.8777)',
          onPress: async () => {
            const res = await setManualLocation(19.0760, 72.8777);
            if (res?.success) {
              setLocationInfo({ latitude: 19.0760, longitude: 72.8777, city: res.city || 'Mumbai', country: res.country || 'India' });
              Alert.alert('Location Updated', 'Set to Mumbai, India! Synced to CleverTap profile.');
            }
          },
        },
        {
          text: '🇺🇸 New York (40.7128, -74.0060)',
          onPress: async () => {
            const res = await setManualLocation(40.7128, -74.0060);
            if (res?.success) {
              setLocationInfo({ latitude: 40.7128, longitude: -74.0060, city: res.city || 'New York', country: res.country || 'United States' });
              Alert.alert('Location Updated', 'Set to New York, USA! Synced to CleverTap profile.');
            }
          },
        },
      ]
    );
  };

  const handleGeofenceSettings = async () => {
    const perms = await checkLocationPermissions();
    if (!perms.isFullyGranted) {
      Alert.alert(
        'Location & Geofencing',
        'Enable background location to receive exclusive store offers and order alerts when entering nearby areas.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Grant Permission',
            onPress: async () => {
              const granted = await requestLocationPermissions();
              if (granted) {
                await handleSyncLiveGPS();
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Geofencing & Location Active',
        'Location permissions are fully enabled. How would you like to update your location for CleverTap?',
        [
          { text: 'Close', style: 'cancel' },
          {
            text: '🎯 Sync Live GPS Location',
            onPress: handleSyncLiveGPS,
          },
          {
            text: '📍 Set Test Store Location',
            onPress: handleSetTestLocation,
          },
        ]
      );
    }
  };

  const menuItems = [
    { icon: '📦', label: 'My Orders', onPress: () => navigation.navigate('Orders') },
    { icon: '🔔', label: 'App Inbox & Messages', onPress: () => showAppInbox() },
    { icon: '📲', label: 'Notification Permissions', onPress: () => promptPushPrimer() },
    { icon: '🌐', label: 'Geofencing & Location Access', onPress: handleGeofenceSettings },
    { icon: '📍', label: 'Saved Addresses', onPress: () => {} },
    { icon: '💳', label: 'Payment Methods', onPress: () => {} },
    { icon: '❓', label: 'Help & Support', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userInfo?.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.name}>{userInfo?.name || 'Guest'}</Text>
          <Text style={styles.email}>{userInfo?.email || ''}</Text>
          {userInfo?.phone ? (
            <Text style={styles.phone}>📞 {userInfo.phone}</Text>
          ) : null}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>Wishlist</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, index < menuItems.length - 1 && styles.menuBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Sync Button */}
        <TouchableOpacity
          style={styles.syncLocationBtn}
          onPress={handleSyncLiveGPS}
          disabled={syncingLocation}
          activeOpacity={0.8}
        >
          {syncingLocation ? (
            <ActivityIndicator size="small" color="#4338ca" />
          ) : (
            <Text style={styles.syncLocationText}>🎯  Sync Current GPS to CleverTap</Text>
          )}
        </TouchableOpacity>

        {/* Location Info Badge */}
        {locationInfo ? (
          <View style={styles.locationContainer}>
            <Text style={styles.locationLabel}>CleverTap Synced Location</Text>
            <Text style={styles.locationValue}>
              📍 {locationInfo.city ? `${locationInfo.city}, ` : ''}{locationInfo.country || 'Detected'}
            </Text>
            <Text style={styles.locationCoords}>
              Lat: {locationInfo.latitude?.toFixed(4)}, Long: {locationInfo.longitude?.toFixed(4)}
            </Text>
          </View>
        ) : null}

        {/* CleverTap ID Container */}
        {cleverTapId ? (
          <View style={styles.ctIdContainer}>
            <Text style={styles.ctIdLabel}>CleverTap ID</Text>
            <Text style={styles.ctIdValue} selectable>{cleverTapId}</Text>
          </View>
        ) : null}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>🚪  Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>ShopEasy v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9ff' },
  profileHeader: { backgroundColor: '#6366f1', paddingVertical: 30, alignItems: 'center', paddingBottom: 50 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 3, borderColor: '#fff' },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  email: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  phone: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, padding: 16, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, marginTop: -24 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#6366f1' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#f0f0f0' },
  menuCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 20, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  menuIcon: { fontSize: 20, marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1a1a2e' },
  menuArrow: { fontSize: 20, color: '#ccc' },
  syncLocationBtn: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#e0e7ff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#6366f1' },
  syncLocationText: { color: '#4338ca', fontSize: 15, fontWeight: '700' },
  locationContainer: { marginHorizontal: 16, marginTop: 14, padding: 14, backgroundColor: '#ecfdf5', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#a7f3d0' },
  locationLabel: { fontSize: 11, fontWeight: '700', color: '#047857', textTransform: 'uppercase', marginBottom: 4 },
  locationValue: { fontSize: 15, fontWeight: '700', color: '#065f46', marginBottom: 2 },
  locationCoords: { fontSize: 12, color: '#047857', fontFamily: 'monospace' },
  ctIdContainer: { marginHorizontal: 16, marginTop: 14, padding: 12, backgroundColor: '#eef2ff', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#c7d2fe' },
  ctIdLabel: { fontSize: 11, fontWeight: '700', color: '#4338ca', textTransform: 'uppercase', marginBottom: 2 },
  ctIdValue: { fontSize: 11, color: '#312e81', fontFamily: 'monospace' },
  logoutBtn: { margin: 16, marginTop: 16, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#ef4444' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', color: '#bbb', fontSize: 12, marginBottom: 20 },
});
