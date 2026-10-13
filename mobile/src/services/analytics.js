export const trackEvent = (eventName, props = {}) => {
  console.log(`[Analytics - CleverTap] ${eventName}`, props);
  // Example for future CleverTap implementation:
  // CleverTap.recordEvent(eventName, props);
};

export const trackProductViewed = (product) => {
  trackEvent('Product Viewed', {
    productId: product._id,
    productName: product.name,
    category: product.category,
    price: product.price
  });
};

export const trackAddToCart = (product, quantity) => {
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

export const trackOrderCompleted = (orderId, totalValue) => {
  trackEvent('Order Completed', {
    orderId,
    totalValue
  });
};
