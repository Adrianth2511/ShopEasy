import { navigate } from '../navigation/navigationRef';
import {
  initGeofence,
  triggerLocation,
  setManualLocation,
  requestLocationPermissions,
  checkLocationPermissions,
  onGeofenceEntered,
  onGeofenceExited,
  onLocationUpdates,
  onGeofenceInitialized,
  isGeofenceInitialized,
} from './geofence';

let cleverTap;

/**
 * Returns the cached CleverTap SDK instance or dynamically requires it.
 */
export const getCleverTap = () => {
  if (cleverTap !== undefined) {
    return cleverTap;
  }

  try {
    const module = require('clevertap-react-native');
    cleverTap = module.default || module;
    console.log('[CleverTap] Native SDK loaded successfully', {
      recordEvent: typeof cleverTap.recordEvent === 'function',
      onUserLogin: typeof cleverTap.onUserLogin === 'function',
      showInbox: typeof cleverTap.showInbox === 'function',
      getAllDisplayUnits: typeof cleverTap.getAllDisplayUnits === 'function',
    });
  } catch (error) {
    cleverTap = null;
    console.warn(
      '[CleverTap] Native module is unavailable. Use a development or release build, not Expo Go.',
      error
    );
  }

  return cleverTap;
};

// Registered listener callbacks
const displayUnitsSubscribers = new Set();
const inboxUpdateSubscribers = new Set();
const pushClickedSubscribers = new Set();

/**
 * Master initialization function called on application launch.
 * Sets verbose debug level, creates notification channel, initializes inbox,
 * and sets up all event listeners for Push, In-App, Inbox, and Native Display.
 */
export const initializeAnalytics = () => {
  const sdk = getCleverTap();
  if (!sdk) {
    console.warn('[CleverTap] SDK not available for initialization.');
    return;
  }

  try {
    // 1. Set debug level to 3 (Verbose) for development and testing
    if (typeof sdk.setDebugLevel === 'function') {
      sdk.setDebugLevel(3);
    }

    // 2. Create notification channels for Android (required for Android O and above)
    createDefaultNotificationChannel();
    // Register primary sound channel and v2 fallback channel
    createSoundNotificationChannel('shopeasy_sound_channel', 'ShopEasy Special Deals & Alerts', 'Flash sales, orders, and promotions with custom sound', 5, true, 'notification_sound.wav');
    createSoundNotificationChannel('shopeasy_sound_channel_v2', 'ShopEasy VIP & Order Alerts', 'Instant notifications with custom sound alert', 5, true, 'notification_sound.wav');

    // 2b. Initialize CleverTap Geofence SDK
    initGeofence().catch((err) => console.log('[CleverTap] Geofence auto-init note:', err));

    // 2c. Auto-sync incoming location coordinates to CleverTap User Profile
    onLocationUpdates((loc) => {
      if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        setUserLocation(loc.latitude, loc.longitude);
        if (loc.city || loc.country || loc.state) {
          const profileData = {
            ...(loc.city ? { City: loc.city } : {}),
            ...(loc.country ? { Country: loc.country } : {}),
            ...(loc.state ? { State: loc.state } : {}),
            Latitude: loc.latitude,
            Longitude: loc.longitude,
          };
          setUserProfile(profileData);
        }
        trackEvent('Location Synced', {
          latitude: loc.latitude,
          longitude: loc.longitude,
          city: loc.city || '',
          country: loc.country || '',
          source: loc.source || 'device',
        });
        console.log('[CleverTap] Profile coordinates & location synced:', loc);
      }
    });

    onGeofenceEntered((data) => {
      console.log('[CleverTap] User entered geofence cluster:', data);
      trackEvent('Geofence Entered', data || {});
    });

    onGeofenceExited((data) => {
      console.log('[CleverTap] User exited geofence cluster:', data);
      trackEvent('Geofence Exited', data || {});
    });

    // 3. Initialize App Inbox
    if (typeof sdk.initializeInbox === 'function') {
      sdk.initializeInbox();
      console.log('[CleverTap] App Inbox initialized');
    }

    // 4. Register event listeners if addListener is available
    if (typeof sdk.addListener === 'function') {
      // --- Profile Lifecycle Listeners ---
      if (sdk.CleverTapProfileSync) {
        sdk.addListener(sdk.CleverTapProfileSync, (event) => {
          console.log('[CleverTap] Profile synced successfully with server:', event);
        });
      }
      if (sdk.CleverTapProfileDidInitialize) {
        sdk.addListener(sdk.CleverTapProfileDidInitialize, (event) => {
          console.log('[CleverTap] Profile initialized:', event);
        });
      }

      // --- Push Notification Listeners ---
      if (sdk.CleverTapPushNotificationClicked) {
        sdk.addListener(sdk.CleverTapPushNotificationClicked, (event) => {
          console.log('[CleverTap] Push Notification clicked payload:', event);
          handlePushNotificationPayload(event);
          pushClickedSubscribers.forEach((cb) => {
            try { cb(event); } catch (e) { console.error('[CleverTap] Push clicked callback error:', e); }
          });
        });
      }
      if (sdk.CleverTapPushPermissionResponseReceived) {
        sdk.addListener(sdk.CleverTapPushPermissionResponseReceived, (event) => {
          console.log('[CleverTap] Push permission response received:', event);
        });
      }

      // --- In-App Notification Listeners ---
      if (sdk.CleverTapInAppNotificationShowed) {
        sdk.addListener(sdk.CleverTapInAppNotificationShowed, (event) => {
          console.log('[CleverTap] In-App Notification showed:', event);
        });
      }
      if (sdk.CleverTapInAppNotificationDismissed) {
        sdk.addListener(sdk.CleverTapInAppNotificationDismissed, (event) => {
          console.log('[CleverTap] In-App Notification dismissed:', event);
        });
      }
      if (sdk.CleverTapInAppNotificationButtonTapped) {
        sdk.addListener(sdk.CleverTapInAppNotificationButtonTapped, (event) => {
          console.log('[CleverTap] In-App Notification CTA button tapped:', event);
        });
      }

      // --- App Inbox Listeners ---
      if (sdk.CleverTapInboxDidInitialize) {
        sdk.addListener(sdk.CleverTapInboxDidInitialize, (event) => {
          console.log('[CleverTap] Inbox did initialize event received:', event);
          inboxUpdateSubscribers.forEach((cb) => {
            try { cb(event); } catch (e) { console.error(e); }
          });
        });
      }
      if (sdk.CleverTapInboxMessagesDidUpdate) {
        sdk.addListener(sdk.CleverTapInboxMessagesDidUpdate, (event) => {
          console.log('[CleverTap] Inbox messages did update event received:', event);
          inboxUpdateSubscribers.forEach((cb) => {
            try { cb(event); } catch (e) { console.error(e); }
          });
        });
      }
      if (sdk.CleverTapInboxMessageButtonTapped) {
        sdk.addListener(sdk.CleverTapInboxMessageButtonTapped, (event) => {
          console.log('[CleverTap] Inbox message button tapped:', event);
        });
      }
      if (sdk.CleverTapInboxMessageTapped) {
        sdk.addListener(sdk.CleverTapInboxMessageTapped, (event) => {
          console.log('[CleverTap] Inbox message tapped:', event);
        });
      }

      // --- Native Display Listeners ---
      if (sdk.CleverTapDisplayUnitsLoaded) {
        sdk.addListener(sdk.CleverTapDisplayUnitsLoaded, (units) => {
          console.log('[CleverTap] Native Display units loaded:', units);
          displayUnitsSubscribers.forEach((cb) => {
            try { cb(units); } catch (e) { console.error('[CleverTap] Display unit callback error:', e); }
          });
        });
      }
    }

    // 5. Prompt for push notifications permission (with Push Primer)
    promptPushPrimer();

  } catch (err) {
    console.error('[CleverTap] Error during initializeAnalytics:', err);
  }
};

/* =========================================================================
 * 1. PUSH NOTIFICATIONS
 * ========================================================================= */

/**
 * Creates the default notification channel for Android 8.0 (API 26) and above.
 */
export const createDefaultNotificationChannel = () => {
  const sdk = getCleverTap();
  if (sdk?.createNotificationChannel) {
    sdk.createNotificationChannel(
      'shopeasy_channel',
      'ShopEasy Notifications',
      'ShopEasy General, Offers, and Order Updates',
      5, // Importance: 5 = High (Heads-up / sound)
      true // Show badge
    );
    console.log('[CleverTap] Notification channel "shopeasy_channel" created');
  }
};

/**
 * Custom Notification Channel creator
 */
export const createNotificationChannel = (channelId, channelName, channelDescription, importance = 5, showBadge = true) => {
  const sdk = getCleverTap();
  if (sdk?.createNotificationChannel) {
    sdk.createNotificationChannel(channelId, channelName, channelDescription, importance, showBadge);
  }
};

/**
 * Creates a notification channel with Custom Sound support (Android 8.0+ / API 26+).
 * The sound file (e.g. 'notification_sound.mp3') must be located in android/app/src/main/res/raw/
 * Note: Android OS locks channel settings once created. If you want to change the sound file,
 * use a new channel ID (e.g. 'shopeasy_sound_channel_v2') or reinstall the app.
 *
 * @param {string} channelId - Channel ID, e.g. 'shopeasy_sound_channel'
 * @param {string} channelName - e.g. 'ShopEasy Special Deals & Alerts'
 * @param {string} channelDescription - e.g. 'Flash sales, orders, and promotions with custom sound'
 * @param {number} importance - 5 for IMPORTANCE_MAX (heads-up notification + sound)
 * @param {boolean} showBadge - true
 * @param {string} soundFileName - File name with extension in res/raw (e.g. 'notification_sound.mp3')
 */
export const createSoundNotificationChannel = (
  channelId = 'shopeasy_sound_channel',
  channelName = 'ShopEasy Special Deals & Alerts',
  channelDescription = 'Flash sales, orders, and promotions with custom sound',
  importance = 5,
  showBadge = true,
  soundFileName = 'notification_sound.wav'
) => {
  const sdk = getCleverTap();
  if (sdk?.createNotificationChannelWithSound) {
    sdk.createNotificationChannelWithSound(
      channelId,
      channelName,
      channelDescription,
      importance,
      showBadge,
      soundFileName
    );
    console.log(`[CleverTap] Sound notification channel "${channelId}" created with sound: ${soundFileName}`);
  } else if (sdk?.createNotificationChannel) {
    sdk.createNotificationChannel(channelId, channelName, channelDescription, importance, showBadge);
    console.log(`[CleverTap] Fallback notification channel "${channelId}" created (without sound method)`);
  }
};

/**
 * Deletes a notification channel by ID (Android 8.0+).
 * Useful if you need to wipe an existing cached channel setting on the device.
 */
export const deleteNotificationChannel = (channelId) => {
  const sdk = getCleverTap();
  if (sdk?.deleteNotificationChannel) {
    sdk.deleteNotificationChannel(channelId);
    console.log(`[CleverTap] Notification channel "${channelId}" deleted`);
  }
};

/**
 * Handles action button clicks, custom action IDs, and deep links from push notifications.
 *
 * When an action button is clicked, CleverTap supplies:
 * - actionId / wzrk_c2a: The identifier of the action button clicked (e.g. ACTION_VIEW_CART, ACTION_SHOP)
 * - wzrk_dl / deep_link: The URL / deeplink assigned to that button or notification (e.g. shopeasy://cart)
 */
export const handlePushNotificationPayload = (event) => {
  if (!event || typeof event !== 'object') return;

  const actionId = event.actionId || event.action_id || event.wzrk_c2a;
  const deeplink = event.wzrk_dl || event.deep_link || event.actionUrl;

  console.log('[CleverTap] Handling push notification click:', {
    actionId,
    deeplink,
    campaignId: event.wzrk_id,
  });

  // Track the action button click to CleverTap
  if (actionId) {
    trackEvent('Push Action Button Clicked', {
      actionId: String(actionId),
      campaignId: String(event.wzrk_id || ''),
      hasDeeplink: Boolean(deeplink),
    });
  }

  // 1. Check Deeplink first (if set on the notification or action button)
  if (deeplink && typeof deeplink === 'string') {
    try {
      const cleanUrl = deeplink.replace(/^shopeasy:\/\//, '').replace(/^https?:\/\/[^\/]+\//, '');
      const [path] = cleanUrl.split('?');
      const segments = path.split('/').filter(Boolean);

      if (segments[0] === 'cart') {
        navigate('Main', { screen: 'Cart' });
        return;
      } else if (segments[0] === 'products' || segments[0] === 'shop') {
        navigate('Main', { screen: 'Products' });
        return;
      } else if (segments[0] === 'orders') {
        navigate('Main', { screen: 'Orders' });
        return;
      } else if (segments[0] === 'profile') {
        navigate('Main', { screen: 'Profile' });
        return;
      } else if (segments[0] === 'product' && segments[1]) {
        navigate('ProductDetails', { productId: segments[1] });
        return;
      } else if (segments[0] === 'order' && segments[1]) {
        navigate('OrderDetails', { orderId: segments[1] });
        return;
      }
    } catch (err) {
      console.warn('[CleverTap] Error parsing push deeplink:', deeplink, err);
    }
  }

  // 2. Route based on Action ID if deeplink was empty
  if (actionId) {
    const normalized = String(actionId).toLowerCase();

    if (normalized.includes('cart')) {
      navigate('Main', { screen: 'Cart' });
    } else if (normalized.includes('product') || normalized.includes('shop') || normalized.includes('deal')) {
      navigate('Main', { screen: 'Products' });
    } else if (normalized.includes('order')) {
      navigate('Main', { screen: 'Orders' });
    } else if (normalized.includes('profile') || normalized.includes('account')) {
      navigate('Main', { screen: 'Profile' });
    } else if (normalized.includes('dismiss') || normalized.includes('cancel')) {
      console.log('[CleverTap] Notification dismissed via action button');
    } else {
      console.log('[CleverTap] Unhandled action button ID:', actionId);
    }
  }
};

/**
 * Displays a Push Primer in-app prompt to educate the user before requesting
 * system notification permission.
 */
export const promptPushPrimer = (customConfig = null) => {
  const sdk = getCleverTap();
  if (!sdk?.promptPushPrimer) {
    return;
  }

  const primerConfig = customConfig || {
    inAppType: 'alert',
    titleText: 'Never Miss a Deal!',
    messageText: 'Enable notifications to get real-time order tracking and exclusive discounts on ShopEasy.',
    followDeviceOrientation: true,
    positiveBtnText: 'Allow Notifications',
    negativeBtnText: 'Maybe Later',
    fallbackToSettings: true,
  };

  try {
    sdk.promptPushPrimer(primerConfig);
    console.log('[CleverTap] Push Primer prompted');
  } catch (e) {
    console.warn('[CleverTap] Push Primer prompt failed, falling back to direct prompt', e);
    if (sdk.promptForPushPermission) {
      sdk.promptForPushPermission(true);
    }
  }
};

/**
 * Direct system dialog prompt for notification permission (without primer).
 */
export const promptForPushPermission = (fallbackToSettings = true) => {
  const sdk = getCleverTap();
  if (sdk?.promptForPushPermission) {
    sdk.promptForPushPermission(fallbackToSettings);
  }
};

/**
 * Checks if push notification permission is granted on the device.
 */
export const checkPushPermission = (callback) => {
  const sdk = getCleverTap();
  if (sdk?.isPushPermissionGranted) {
    sdk.isPushPermissionGranted((err, res) => {
      if (callback) callback(err, res);
    });
  }
};

/**
 * Register for Push on iOS
 */
export const registerForPush = () => {
  const sdk = getCleverTap();
  if (sdk?.registerForPush) {
    sdk.registerForPush();
  }
};

/**
 * Manually set the FCM Push Token if custom messaging service is used.
 */
export const setFCMPushToken = (token) => {
  const sdk = getCleverTap();
  if (sdk?.setFCMPushToken && token) {
    sdk.setFCMPushToken(token);
  }
};

/**
 * Subscribe to push notification click events.
 */
export const onPushNotificationClicked = (callback) => {
  pushClickedSubscribers.add(callback);
  return () => pushClickedSubscribers.delete(callback);
};

/* =========================================================================
 * 2. IN-APP NOTIFICATIONS
 * ========================================================================= */

/**
 * Temporarily suspends in-app notifications (e.g. during checkout flow).
 */
export const suspendInAppNotifications = () => {
  const sdk = getCleverTap();
  if (sdk?.suspendInAppNotifications) {
    sdk.suspendInAppNotifications();
    console.log('[CleverTap] In-App notifications suspended');
  }
};

/**
 * Resumes displaying in-app notifications and presents queued ones.
 */
export const resumeInAppNotifications = () => {
  const sdk = getCleverTap();
  if (sdk?.resumeInAppNotifications) {
    sdk.resumeInAppNotifications();
    console.log('[CleverTap] In-App notifications resumed');
  }
};

/**
 * Discards pending in-app notifications and suspends new ones.
 */
export const discardInAppNotifications = () => {
  const sdk = getCleverTap();
  if (sdk?.discardInAppNotifications) {
    sdk.discardInAppNotifications();
    console.log('[CleverTap] In-App notifications discarded');
  }
};

/**
 * Programmatically dismisses the currently active PIP (picture-in-picture) in-app.
 */
export const dismissPipInApp = () => {
  const sdk = getCleverTap();
  if (sdk?.dismissPipInApp) {
    sdk.dismissPipInApp();
  }
};

/* =========================================================================
 * 3. APP INBOX
 * ========================================================================= */

/**
 * Shows the native CleverTap App Inbox Activity / View.
 */
export const showAppInbox = (customStyle = null) => {
  const sdk = getCleverTap();
  if (!sdk?.showInbox) {
    console.warn('[CleverTap] showInbox is unavailable');
    return;
  }

  const defaultStyle = {
    navBarTitle: 'Notifications & Offers',
    navBarTitleColor: '#1e1b4b',
    navBarColor: '#ffffff',
    inboxBackgroundColor: '#f8f9ff',
    backButtonColor: '#6366f1',
    unselectedTabColor: '#94a3b8',
    selectedTabColor: '#6366f1',
    selectedTabIndicatorColor: '#6366f1',
    noMessageViewText: 'No notifications right now',
    noMessageViewTextColor: '#64748b',
  };

  sdk.showInbox(customStyle || defaultStyle);
};

/**
 * Dismisses the App Inbox programmatically.
 */
export const dismissAppInbox = () => {
  const sdk = getCleverTap();
  if (sdk?.dismissInbox) {
    sdk.dismissInbox();
  }
};

/**
 * Gets total unread messages count in App Inbox.
 */
export const getInboxUnreadCount = (callback) => {
  const sdk = getCleverTap();
  if (sdk?.getInboxMessageUnreadCount) {
    sdk.getInboxMessageUnreadCount((err, count) => {
      if (callback) callback(err, count);
    });
  } else if (callback) {
    callback(null, 0);
  }
};

/**
 * Gets total message count in App Inbox.
 */
export const getInboxMessageCount = (callback) => {
  const sdk = getCleverTap();
  if (sdk?.getInboxMessageCount) {
    sdk.getInboxMessageCount((err, count) => {
      if (callback) callback(err, count);
    });
  }
};

/**
 * Returns all inbox messages.
 */
export const getAllInboxMessages = (callback) => {
  const sdk = getCleverTap();
  if (sdk?.getAllInboxMessages) {
    sdk.getAllInboxMessages((err, messages) => {
      if (callback) callback(err, messages);
    });
  }
};

/**
 * Marks an inbox message as read.
 */
export const markInboxMessageRead = (messageId) => {
  const sdk = getCleverTap();
  if (sdk?.markReadInboxMessageForId && messageId) {
    sdk.markReadInboxMessageForId(messageId);
  }
};

/**
 * Deletes an inbox message by ID.
 */
export const deleteInboxMessage = (messageId) => {
  const sdk = getCleverTap();
  if (sdk?.deleteInboxMessageForId && messageId) {
    sdk.deleteInboxMessageForId(messageId);
  }
};

/**
 * Subscribe to App Inbox updates (when messages arrive or are modified).
 */
export const onInboxUpdated = (callback) => {
  inboxUpdateSubscribers.add(callback);
  return () => inboxUpdateSubscribers.delete(callback);
};

/* =========================================================================
 * 4. NATIVE DISPLAY
 * ========================================================================= */

/**
 * Fetches all available Native Display units.
 */
export const getAllDisplayUnits = (callback) => {
  const sdk = getCleverTap();
  if (sdk?.getAllDisplayUnits) {
    sdk.getAllDisplayUnits((err, units) => {
      if (callback) callback(err, units);
    });
  } else if (callback) {
    callback(null, []);
  }
};

/**
 * Fetches a specific Native Display unit by its unitID.
 */
export const getDisplayUnitForId = (unitId, callback) => {
  const sdk = getCleverTap();
  if (sdk?.getDisplayUnitForId && unitId) {
    sdk.getDisplayUnitForId(unitId, (err, unit) => {
      if (callback) callback(err, unit);
    });
  }
};

/**
 * Records a Display Unit Viewed impression to CleverTap.
 */
export const recordDisplayUnitViewed = (unitId) => {
  const sdk = getCleverTap();
  if (sdk?.pushDisplayUnitViewedEventForID && unitId) {
    sdk.pushDisplayUnitViewedEventForID(unitId);
    console.log('[CleverTap] Display unit viewed recorded:', unitId);
  }
};

/**
 * Records a Display Unit Clicked event to CleverTap.
 */
export const recordDisplayUnitClicked = (unitId) => {
  const sdk = getCleverTap();
  if (sdk?.pushDisplayUnitClickedEventForID && unitId) {
    sdk.pushDisplayUnitClickedEventForID(unitId);
    console.log('[CleverTap] Display unit clicked recorded:', unitId);
  }
};

/**
 * Records an element-level click within a Display Unit.
 */
export const recordDisplayUnitElementClicked = (unitId, additionalProperties = {}) => {
  const sdk = getCleverTap();
  if (sdk?.pushDisplayUnitElementClickedEventForID && unitId) {
    sdk.pushDisplayUnitElementClickedEventForID(unitId, additionalProperties);
  }
};

/**
 * Subscribe to Native Display units loaded event.
 */
export const onDisplayUnitsLoaded = (callback) => {
  displayUnitsSubscribers.add(callback);
  return () => displayUnitsSubscribers.delete(callback);
};

/* =========================================================================
 * 5. USER PROFILE & IDENTITY
 * ========================================================================= */

/**
 * Pushes logged in user profile to CleverTap and records identification event.
 */
export const identifyUser = (user) => {
  if (!user) {
    return;
  }

  const identity = user._id || user.id || user.Identity || user.email || user.Email;
  const profile = {
    Name: user.name || user.Name,
    Email: user.email || user.Email,
    Phone: user.phone || user.Phone,
    Identity: identity ? String(identity) : undefined,
  };

  const filteredProfile = Object.fromEntries(
    Object.entries(profile).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );

  const sdk = getCleverTap();
  if (!sdk || Object.keys(filteredProfile).length === 0) {
    console.warn('[CleverTap] Cannot identify user: native SDK unavailable or profile empty.');
    return;
  }

  try {
    if (sdk.onUserLogin) {
      sdk.onUserLogin(filteredProfile);
    }

    if (sdk.recordEvent) {
      sdk.recordEvent('ShopEasy User Identified', {
        HasEmail: Boolean(filteredProfile.Email),
        HasPhone: Boolean(filteredProfile.Phone),
      });
    }

    console.log('[CleverTap] User profile queued:', {
      identity: filteredProfile.Identity,
      email: filteredProfile.Email,
    });

    verifyCleverTapProfile();
  } catch (error) {
    console.error('[CleverTap] Failed to queue user profile:', error);
  }
};

/**
 * Updates user profile properties without changing identity.
 */
export const setUserProfile = (props) => {
  const sdk = getCleverTap();
  if (sdk?.profileSet && props) {
    sdk.profileSet(props);
  }
};

/**
 * Updates user geographic location and immediately flushes Latitude/Longitude to profile.
 */
export const setUserLocation = (latitude, longitude) => {
  const sdk = getCleverTap();
  if (sdk?.setLocation && typeof latitude === 'number' && typeof longitude === 'number') {
    sdk.setLocation(latitude, longitude);
    if (sdk.profileSet) {
      sdk.profileSet({
        Latitude: latitude,
        Longitude: longitude,
      });
    }
  }
};

/**
 * Fetches the unique CleverTap ID assigned to this device/user.
 */
export const getCleverTapID = (callback) => {
  const sdk = getCleverTap();
  if (sdk?.profileGetCleverTapID) {
    sdk.profileGetCleverTapID((error, cleverTapId) => {
      if (callback) callback(error, cleverTapId);
    });
  } else if (callback) {
    callback(new Error('SDK unavailable'), null);
  }
};

export const verifyCleverTapProfile = () => {
  getCleverTapID((error, cleverTapId) => {
    if (error) {
      console.error('[CleverTap] Profile ID lookup failed:', error);
      return;
    }
    console.log('[CleverTap] Active CleverTap ID:', cleverTapId);
  });
};

/* =========================================================================
 * 6. ECOMMERCE & BEHAVIORAL EVENTS
 * ========================================================================= */

/**
 * Record a generic event with properties.
 */
export const trackEvent = (eventName, props = {}) => {
  const sdk = getCleverTap();
  if (!sdk?.recordEvent) {
    return;
  }

  sdk.recordEvent(eventName, props);
};

export const trackProductViewed = (product) => {
  if (!product?._id) return;
  const priceNum = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
  trackEvent('Product Viewed', {
    productId: String(product._id),
    productName: product.name || '',
    category: product.category || 'General',
    price: priceNum,
    image: product.image || '',
    // Common aliases for CleverTap Liquid personalization tags
    name: product.name || '',
    Price: priceNum,
    Product_Name: product.name || '',
    Product_Image: product.image || '',
    Product_Price: priceNum,
    Product_Id: String(product._id),
  });
};

export const trackAddToCart = (product, quantity = 1) => {
  if (!product?._id) return;
  const priceNum = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
  const qtyNum = typeof quantity === 'number' ? quantity : parseInt(quantity, 10) || 1;
  trackEvent('Product Added To Cart', {
    productId: String(product._id),
    productName: product.name || '',
    category: product.category || 'General',
    price: priceNum,
    image: product.image || '',
    quantity: qtyNum,
    // Common aliases for CleverTap Liquid personalization tags
    name: product.name || '',
    Price: priceNum,
    Product_Name: product.name || '',
    Product_Image: product.image || '',
    Product_Price: priceNum,
    Product_Id: String(product._id),
    Quantity: qtyNum,
  });
};

export const trackCheckoutStarted = (cartTotal) => {
  trackEvent('Checkout Started', {
    totalValue: cartTotal,
  });
};

export const trackOrderCompleted = (orderId, totalValue, items = []) => {
  trackEvent('Order Completed', {
    orderId,
    totalValue,
  });

  const sdk = getCleverTap();
  if (sdk?.recordChargedEvent) {
    sdk.recordChargedEvent(
      {
        totalValue,
        orderId,
        paymentMethod: 'Cash on Delivery',
      },
      items
    );
    console.log('[CleverTap] Charged event recorded for order:', orderId);
  }
};

/* =========================================================================
 * 7. GDPR & PRIVACY CONTROLS
 * ========================================================================= */

/**
 * Completely opt in or out of all CleverTap tracking and communications.
 */
export const setOptOut = (optOut) => {
  const sdk = getCleverTap();
  if (sdk?.setOptOut) {
    sdk.setOptOut(Boolean(optOut));
    console.log('[CleverTap] setOptOut:', optOut);
  }
};

/**
 * Pause / resume real-time event transmission.
 */
export const setOffline = (offline) => {
  const sdk = getCleverTap();
  if (sdk?.setOffline) {
    sdk.setOffline(Boolean(offline));
    console.log('[CleverTap] setOffline:', offline);
  }
};

/**
 * Enable or disable device network info reporting (Wi-Fi, IP, Bluetooth).
 */
export const enableDeviceNetworkInfoReporting = (enable) => {
  const sdk = getCleverTap();
  if (sdk?.enableDeviceNetworkInfoReporting) {
    sdk.enableDeviceNetworkInfoReporting(Boolean(enable));
  }
};

// Re-export Geofence capabilities
export {
  initGeofence,
  triggerLocation,
  setManualLocation,
  requestLocationPermissions,
  checkLocationPermissions,
  onGeofenceEntered,
  onGeofenceExited,
  onLocationUpdates,
  onGeofenceInitialized,
  isGeofenceInitialized,
};
