import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../config/api';

export default function OrderDetailsScreen({ route }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, []);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/orders/${orderId}`);
      setOrder(res.data.order);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <Image source={{ uri: item.productId.image }} style={styles.image} />
      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={2}>{item.productId.name}</Text>
        <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
      </View>
    </View>
  );

  if (loading) return <SafeAreaView style={[styles.container, {justifyContent: 'center'}]}><ActivityIndicator size="large" color="#0066cc" /></SafeAreaView>;
  if (!order) return <SafeAreaView style={styles.container}><Text>Order not found</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Text style={styles.title}>Order #{order._id.substring(0, 8).toUpperCase()}</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text style={styles.statusValue}>{order.orderStatus}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Date:</Text>
              <Text style={styles.statusValue}>{new Date(order.createdAt).toLocaleDateString()}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shipping To:</Text>
              <Text>{order.shippingAddress.street}</Text>
              <Text>{order.shippingAddress.city}, {order.shippingAddress.zip}</Text>
            </View>
            <Text style={styles.sectionTitle}>Items</Text>
          </View>
        )}
        data={order.items}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        ListFooterComponent={() => (
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text>Subtotal</Text>
              <Text>${order.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Delivery</Text>
              <Text>${order.deliveryFee.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalText}>Total</Text>
              <Text style={styles.totalText}>${order.total.toFixed(2)}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { padding: 20, backgroundColor: '#fff', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  statusRow: { flexDirection: 'row', marginBottom: 5 },
  statusLabel: { width: 60, color: '#666' },
  statusValue: { fontWeight: 'bold' },
  section: { marginTop: 15, padding: 15, backgroundColor: '#f5f5f5', borderRadius: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 10 },
  list: { paddingBottom: 20 },
  itemRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, marginBottom: 2 },
  image: { width: 60, height: 60, borderRadius: 5, marginRight: 15 },
  itemDetails: { flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 16, fontWeight: '500', marginBottom: 5 },
  itemQty: { color: '#666', marginBottom: 2 },
  itemPrice: { fontWeight: 'bold', color: '#0066cc' },
  summary: { backgroundColor: '#fff', padding: 20, marginTop: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  totalRow: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 5 },
  totalText: { fontSize: 18, fontWeight: 'bold' }
});
