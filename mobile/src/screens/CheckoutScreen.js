import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../config/api';
import { trackCheckoutStarted, trackOrderCompleted } from '../services/analytics';

export default function CheckoutScreen({ route, navigation }) {
  const { total, items = [] } = route.params;
  const deliveryFee = 10;
  const grandTotal = total + deliveryFee;

  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    trackCheckoutStarted(grandTotal);
  }, []);

  const handlePlaceOrder = async () => {
    if (!street || !city || !zip) {
      Alert.alert('Error', 'Please fill in your shipping details');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        shippingAddress: { street, city, state: '', zip, country: 'US' },
        paymentMethod: 'Cash on Delivery',
      };

      const res = await api.post('/orders', orderData);

      if (res.data.success) {
        trackOrderCompleted(
          res.data.order._id,
          grandTotal,
          items.map(({ productId, quantity }) => ({
            title: productId.name,
            productId: productId._id,
            price: productId.price,
            quantity,
          }))
        );
        // Navigate to OrderSuccess screen — do NOT use navigation.reset here
        navigation.navigate('OrderSuccess', { orderId: res.data.order._id });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>Checkout</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <TextInput style={styles.input} placeholder="Street Address" value={street} onChangeText={setStreet} />
          <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
          <TextInput style={styles.input} placeholder="ZIP Code" value={zip} onChangeText={setZip} keyboardType="numeric" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentMethod}>
            <Text style={styles.paymentText}>✓  Cash on Delivery</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Subtotal</Text>
            <Text style={styles.summaryText}>${total.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Delivery Fee</Text>
            <Text style={styles.summaryText}>${deliveryFee.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalText}>Total</Text>
            <Text style={styles.totalAmount}>${grandTotal.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handlePlaceOrder} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Place Order</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  scroll: { padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  section: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  paymentMethod: { padding: 15, backgroundColor: '#e6f2ff', borderRadius: 8, borderWidth: 1, borderColor: '#b3d9ff' },
  paymentText: { color: '#0066cc', fontWeight: 'bold', fontSize: 16 },
  summary: { backgroundColor: '#fff', padding: 20, borderRadius: 10, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryText: { fontSize: 16, color: '#555' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15, marginTop: 5 },
  totalText: { fontSize: 18, fontWeight: 'bold' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#0066cc' },
  button: { backgroundColor: '#0066cc', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
