import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../config/api';
import { trackAddToCart, trackProductViewed } from '../services/analytics';
import { AuthContext } from '../context/AuthContext';

export default function ProductDetailsScreen({ route, navigation }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { userToken } = useContext(AuthContext);

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/products/${productId}`);
      const fetchedProduct = res?.data?.product || null;
      setProduct(fetchedProduct);
      trackProductViewed(fetchedProduct);
    } catch (e) {
      console.error('[ProductDetails]', e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!userToken) {
      Alert.alert('Login Required', 'Please login to add items to cart.');
      return;
    }
    setAddingToCart(true);
    try {
      await api.post('/cart', { productId, quantity });
      trackAddToCart(product, quantity);
      Alert.alert('Added! 🎉', `${product.name} added to your cart.`, [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => navigation.navigate('Main', { screen: 'Cart' }) },
      ]);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to add to cart';
      Alert.alert('Error', msg);
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
          <TouchableOpacity style={styles.backArrow} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrowText}>←</Text>
          </TouchableOpacity>
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>{product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}</Text>
          </View>
        </View>

        <View style={styles.details}>
          {/* Category & Brand */}
          <View style={styles.metaRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
            <Text style={styles.brand}>{product.brand}</Text>
          </View>

          {/* Name */}
          <Text style={styles.name}>{product.name}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1,2,3,4,5].map(i => (
              <Text key={i} style={{ fontSize: 16, color: i <= Math.round(product.rating) ? '#f59e0b' : '#ddd' }}>★</Text>
            ))}
            <Text style={styles.ratingNum}>{product.rating?.toFixed(1)} rating</Text>
          </View>

          {/* Price */}
          <Text style={styles.price}>${product.price?.toFixed(2)}</Text>

          {/* Description */}
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>

          {/* Quantity Selector */}
          <Text style={styles.sectionLabel}>Quantity</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
              onPress={() => setQuantity(q => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.qtyBtn, quantity >= product.stock && styles.qtyBtnDisabled]}
              onPress={() => setQuantity(q => Math.min(product.stock, q + 1))}
              disabled={quantity >= product.stock}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.qtyTotal}>  = ${(product.price * quantity).toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Add to Cart Button */}
      <View style={styles.footer}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerPriceLabel}>Total</Text>
          <Text style={styles.footerPriceValue}>${(product.price * quantity).toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, (product.stock === 0 || addingToCart) && styles.addBtnDisabled]}
          onPress={handleAddToCart}
          disabled={product.stock === 0 || addingToCart}
          activeOpacity={0.8}
        >
          {addingToCart
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.addBtnText}>{product.stock === 0 ? 'Out of Stock' : '🛒  Add to Cart'}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9ff' },
  errorText: { fontSize: 18, color: '#666', marginBottom: 20 },
  backBtn: { backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  backBtnText: { color: '#fff', fontWeight: 'bold' },
  imageContainer: { position: 'relative', height: 320, backgroundColor: '#e8e8f0' },
  image: { width: '100%', height: '100%' },
  backArrow: { position: 'absolute', top: 50, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backArrowText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  stockBadge: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(99,102,241,0.9)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  stockText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  details: { padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryBadge: { backgroundColor: '#ede9fe', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  categoryText: { color: '#6366f1', fontSize: 13, fontWeight: '600' },
  brand: { color: '#888', fontSize: 14 },
  name: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 10, lineHeight: 28 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  ratingNum: { marginLeft: 8, color: '#888', fontSize: 14 },
  price: { fontSize: 28, fontWeight: '900', color: '#6366f1', marginBottom: 16 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 8, marginTop: 8 },
  description: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 16 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  qtyBtn: { backgroundColor: '#6366f1', width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  qtyBtnDisabled: { backgroundColor: '#ccc' },
  qtyBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold', lineHeight: 22 },
  qtyValue: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 20, minWidth: 30, textAlign: 'center' },
  qtyTotal: { fontSize: 16, color: '#6366f1', fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  footerPrice: { marginRight: 16 },
  footerPriceLabel: { fontSize: 12, color: '#888' },
  footerPriceValue: { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  addBtn: { flex: 1, backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  addBtnDisabled: { backgroundColor: '#ccc' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
