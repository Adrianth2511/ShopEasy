import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import {
  getAllDisplayUnits,
  onDisplayUnitsLoaded,
  recordDisplayUnitViewed,
  recordDisplayUnitClicked,
} from '../services/analytics';

export default function NativeDisplayBanner({ navigation }) {
  const [displayUnit, setDisplayUnit] = useState(null);

  useEffect(() => {
    // 1. Fetch any already cached display units
    getAllDisplayUnits((err, units) => {
      if (!err && Array.isArray(units) && units.length > 0) {
        handleDisplayUnits(units);
      }
    });

    // 2. Listen for dynamically loaded display units from CleverTap
    const unsubscribe = onDisplayUnitsLoaded((units) => {
      if (Array.isArray(units) && units.length > 0) {
        handleDisplayUnits(units);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleDisplayUnits = (units) => {
    const unit = units[0];
    if (unit && unit.unitID) {
      setDisplayUnit(unit);
      // Automatically record impression for the display unit
      recordDisplayUnitViewed(unit.unitID);
    }
  };

  const handlePress = () => {
    if (!displayUnit) return;

    // Report click to CleverTap
    recordDisplayUnitClicked(displayUnit.unitID);

    // Deep link or navigate if action URL is present
    const content = displayUnit.content?.[0];
    const actionUrl =
      content?.action?.url?.android ||
      content?.action?.url?.ios ||
      content?.action?.url;

    if (actionUrl) {
      Linking.canOpenURL(actionUrl).then((supported) => {
        if (supported) {
          Linking.openURL(actionUrl);
        } else if (navigation) {
          navigation.navigate('Products');
        }
      });
    } else if (navigation) {
      navigation.navigate('Products');
    }
  };

  // If CleverTap has returned a native display campaign, render it
  if (displayUnit) {
    const content = displayUnit.content?.[0] || {};
    const title = content.title?.text || 'Special Promotion';
    const titleColor = content.title?.color || '#ffffff';
    const message = content.message?.text || 'Tap to explore exclusive offers!';
    const messageColor = content.message?.color || '#f1f5f9';
    const mediaUrl = content.mediaUrl;
    const bgColor = displayUnit.bgColor || '#4f46e5';

    return (
      <TouchableOpacity
        style={[styles.customBanner, { backgroundColor: bgColor }]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <View style={styles.bannerRow}>
          {mediaUrl ? (
            <Image
              source={{ uri: mediaUrl }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.textContainer}>
            <View style={styles.ctBadge}>
              <Text style={styles.ctBadgeText}>Featured</Text>
            </View>
            <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
              {title}
            </Text>
            <Text
              style={[styles.message, { color: messageColor }]}
              numberOfLines={2}
            >
              {message}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Fallback default banner if no campaign is active on CleverTap yet
  return (
    <TouchableOpacity
      style={styles.defaultBanner}
      onPress={() => navigation?.navigate('Products')}
      activeOpacity={0.85}
    >
      <Text style={styles.defaultTitle}>🔥 Today's Deals</Text>
      <Text style={styles.defaultSub}>Up to 40% off on selected items</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  defaultBanner: {
    backgroundColor: '#6366f1',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  defaultTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  defaultSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
  customBanner: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerImage: {
    width: 68,
    height: 68,
    borderRadius: 10,
    marginRight: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  textContainer: {
    flex: 1,
  },
  ctBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  ctBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
  },
});
