import React, { useEffect, useState, useCallback } from 'react';
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
  const [dismissedUnitId, setDismissedUnitId] = useState(null);

  const extractUnits = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.units)) return raw.units;
    if (Array.isArray(raw.displayUnits)) return raw.displayUnits;
    return [];
  };

  const handleDisplayUnit = useCallback((unit) => {
    if (!unit) return;
    const unitId = unit.unitID || unit.id || unit.unitsId || unit.wzrk_id;
    if (!unitId) return;

    setDisplayUnit(unit);
    // Track impression automatically with CleverTap
    recordDisplayUnitViewed(unitId);
  }, []);

  const refreshUnits = useCallback(() => {
    getAllDisplayUnits((err, res) => {
      if (err) return;
      const list = extractUnits(res);
      if (list.length > 0) {
        handleDisplayUnit(list[0]);
      }
    });
  }, [handleDisplayUnit]);

  useEffect(() => {
    // 1. Initial query for existing cached display units
    refreshUnits();

    // 2. Real-time listener for newly arrived display units from CleverTap
    const unsubscribeLoaded = onDisplayUnitsLoaded((units) => {
      const list = extractUnits(units);
      if (list.length > 0) {
        handleDisplayUnit(list[0]);
      }
    });

    // 3. Re-query when user navigates back to this screen (e.g. after adding to cart)
    const unsubscribeFocus = navigation?.addListener?.('focus', () => {
      refreshUnits();
    });

    return () => {
      if (typeof unsubscribeLoaded === 'function') unsubscribeLoaded();
      if (typeof unsubscribeFocus === 'function') unsubscribeFocus();
    };
  }, [navigation, refreshUnits, handleDisplayUnit]);

  const handlePress = () => {
    if (!displayUnit) return;

    const unitId = displayUnit.unitID || displayUnit.id || displayUnit.unitsId || displayUnit.wzrk_id;
    if (unitId) {
      recordDisplayUnitClicked(unitId);
    }

    const extras = displayUnit.customExtras || {};
    const content = (displayUnit.content && displayUnit.content[0]) || {};
    const actionUrl =
      content.action?.url?.android ||
      content.action?.url?.ios ||
      content.action?.url ||
      content.actionUrl ||
      extras.actionUrl ||
      extras.url ||
      '';

    const targetProductId =
      extras.productId ||
      extras.Product_Id ||
      extras.productIdStr ||
      extras.id;

    // 1. If screen is explicitly requested as Cart
    if (
      extras.screen?.toLowerCase() === 'cart' ||
      actionUrl.toLowerCase() === 'cart' ||
      actionUrl.includes('shopeasy://cart')
    ) {
      if (navigation) navigation.navigate('Cart');
      return;
    }

    // 2. Direct navigation to product if productId was passed via Liquid tag
    if (targetProductId && navigation) {
      navigation.navigate('ProductDetails', { productId: String(targetProductId) });
      return;
    }

    // 3. Fallback to external or deep link URL
    if (actionUrl && actionUrl.startsWith('http')) {
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

  const handleDismiss = () => {
    const unitId = displayUnit?.unitID || displayUnit?.id || displayUnit?.unitsId;
    setDismissedUnitId(unitId);
  };

  // If a CleverTap display unit is active and not dismissed
  const unitId = displayUnit?.unitID || displayUnit?.id || displayUnit?.unitsId;
  const isShown = displayUnit && dismissedUnitId !== unitId;

  if (isShown) {
    const content = (displayUnit.content && displayUnit.content[0]) || {};
    const extras = displayUnit.customExtras || {};

    const title =
      (typeof content.title === 'string' ? content.title : content.title?.text) ||
      extras.title ||
      extras.productName ||
      extras.Product_Name ||
      extras.name ||
      'Exclusive Offer';

    const titleColor = content.title?.color || '#ffffff';

    const message =
      (typeof content.message === 'string' ? content.message : content.message?.text) ||
      extras.message ||
      extras.description ||
      (extras.price ? `Only $${extras.price}` : '') ||
      'Tap to complete your purchase!';

    const messageColor = content.message?.color || '#e0e7ff';

    const mediaUrl =
      content.media?.url ||
      content.mediaUrl ||
      extras.image ||
      extras.Product_Image ||
      extras.imageUrl ||
      extras.mediaUrl ||
      '';

    const badgeText = extras.badge || extras.Badge || 'In Your Cart 🛒';
    const bgColor = displayUnit.bg || displayUnit.bgColor || '#4338ca';

    return (
      <View style={[styles.customBanner, { backgroundColor: bgColor }]}>
        <TouchableOpacity
          style={styles.bannerTouchable}
          onPress={handlePress}
          activeOpacity={0.88}
        >
          {mediaUrl ? (
            <Image
              source={{ uri: mediaUrl }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : null}

          <View style={styles.textContainer}>
            <View style={styles.badgeRow}>
              <View style={styles.ctBadge}>
                <Text style={styles.ctBadgeText}>{badgeText}</Text>
              </View>
            </View>

            <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
              {title}
            </Text>

            <Text style={[styles.message, { color: messageColor }]} numberOfLines={2}>
              {message}
            </Text>

            <View style={styles.ctaPill}>
              <Text style={styles.ctaPillText}>View Details →</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Dismiss Button */}
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={handleDismiss}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Fallback banner when no CleverTap Native Display campaign is active yet
  return (
    <TouchableOpacity
      style={styles.defaultBanner}
      onPress={() => navigation?.navigate('Products')}
      activeOpacity={0.88}
    >
      <View style={styles.defaultContent}>
        <View style={styles.defaultBadge}>
          <Text style={styles.defaultBadgeText}>FLASH SALE</Text>
        </View>
        <Text style={styles.defaultTitle}>🔥 Up to 40% Off Top Brands</Text>
        <Text style={styles.defaultSub}>Check out our handpicked deals for you today</Text>
      </View>
      <View style={styles.defaultArrow}>
        <Text style={styles.arrowText}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  customBanner: {
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#4338ca',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  bannerTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  bannerImage: {
    width: 76,
    height: 76,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ctBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ctBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 2,
  },
  ctaPillText: {
    color: '#4338ca',
    fontSize: 11,
    fontWeight: '800',
  },
  dismissBtn: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 12,
  },
  defaultBanner: {
    backgroundColor: '#4f46e5',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  defaultContent: {
    flex: 1,
  },
  defaultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  defaultTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  defaultSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  defaultArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  arrowText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
