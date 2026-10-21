let cleverTap;

const getCleverTap = () => {
  if (cleverTap !== undefined) {
    return cleverTap;
  }

  try {
    const module = require('clevertap-react-native');
    cleverTap = module.default || module;
    console.log('[CleverTap] Native SDK loaded', {
      recordEvent: typeof cleverTap.recordEvent === 'function',
      onUserLogin: typeof cleverTap.onUserLogin === 'function',
      profileSet: typeof cleverTap.profileSet === 'function',
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

export const initializeAnalytics = () => {
  getCleverTap();
};

export const trackEvent = (eventName, props = {}) => {
  const sdk = getCleverTap();
  if (!sdk?.recordEvent) {
    return;
  }

  sdk.recordEvent(eventName, props);
};

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
    Object.entries(profile).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const sdk = getCleverTap();

  if (!sdk || Object.keys(filteredProfile).length === 0) {
    console.warn('[CleverTap] Cannot identify user: native SDK is unavailable or profile is empty.');
    return;
  }

  try {
    if (sdk.onUserLogin) {
      sdk.onUserLogin(filteredProfile);
    }

    if (sdk.profileSet) {
      sdk.profileSet(filteredProfile);
    }

    if (sdk.recordEvent) {
      sdk.recordEvent('ShopEasy User Identified', {
        HasEmail: Boolean(filteredProfile.Email),
        HasPhone: Boolean(filteredProfile.Phone),
      });
    }

    console.log('[CleverTap] User profile queued', {
      identity: filteredProfile.Identity,
      email: filteredProfile.Email,
    });
    verifyCleverTapProfile();
  } catch (error) {
    console.error('[CleverTap] Failed to queue user profile', error);
  }
};

export const verifyCleverTapProfile = () => {
  const sdk = getCleverTap();
  if (!sdk?.profileGetCleverTapID) {
    console.warn('[CleverTap] profileGetCleverTapID is unavailable.');
    return;
  }

  sdk.profileGetCleverTapID((error, cleverTapId) => {
    if (error) {
      console.error('[CleverTap] Profile ID lookup failed', error);
      return;
    }

    console.log('[CleverTap] Profile ID', cleverTapId);
  });
};

export const setUserProfile = (props) => {
  const sdk = getCleverTap();
  if (sdk?.profileSet && props) {
    sdk.profileSet(props);
  }
};

export const setUserLocation = (latitude, longitude) => {
  const sdk = getCleverTap();
  if (sdk?.setLocation) {
    sdk.setLocation(latitude, longitude);
  }
};

export const trackProductViewed = (product) => {
  if (!product?._id) {
    return;
  }

  trackEvent('Product Viewed', {
    productId: product._id,
    productName: product.name,
    category: product.category,
    price: product.price
  });
};

export const trackAddToCart = (product, quantity) => {
  if (!product?._id) {
    return;
  }

  trackEvent('Product Added To Cart', {
    productId: product._id,
    productName: product.name,
    quantity,
    price: product.price
  });
};

export const trackCheckoutStarted = (cartTotal) => {
  trackEvent('Checkout Started', {
    totalValue: cartTotal
  });
};

export const trackOrderCompleted = (orderId, totalValue, items = []) => {
  trackEvent('Order Completed', {
    orderId,
    totalValue
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
  }
};
