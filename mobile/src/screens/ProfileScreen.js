import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import {
  showAppInbox,
  promptPushPrimer,
  getCleverTapID,
} from '../services/analytics';

export default function ProfileScreen({ navigation }) {
  const { userInfo, logout } = useContext(AuthContext);
  const [cleverTapId, setCleverTapId] = useState(null);

  useEffect(() => {
    getCleverTapID((err, id) => {
      if (!err && id) {
        setCleverTapId(id);
      }
    });
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

  const menuItems = [
    { icon: '📦', label: 'My Orders', onPress: () => navigation.navigate('Orders') },
    { icon: '🔔', label: 'App Inbox & Messages', onPress: () => showAppInbox() },
    { icon: '📲', label: 'Notification Permissions', onPress: () => promptPushPrimer() },
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

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>🚪  Logout</Text>
        </TouchableOpacity>

        {cleverTapId ? (
          <View style={styles.ctIdContainer}>
            <Text style={styles.ctIdLabel}>CleverTap ID</Text>
            <Text style={styles.ctIdValue} selectable>{cleverTapId}</Text>
          </View>
        ) : null}

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
  logoutBtn: { margin: 16, marginTop: 20, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#ef4444' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
  ctIdContainer: { marginHorizontal: 20, marginBottom: 14, padding: 12, backgroundColor: '#eef2ff', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#c7d2fe' },
  ctIdLabel: { fontSize: 11, fontWeight: '700', color: '#4338ca', textTransform: 'uppercase', marginBottom: 2 },
  ctIdValue: { fontSize: 11, color: '#312e81', fontFamily: 'monospace' },
  version: { textAlign: 'center', color: '#bbb', fontSize: 12, marginBottom: 20 },
});
