import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrderSuccessScreen({ route, navigation }) {
  const orderId = route.params?.orderId;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>✅</Text>
        <Text style={styles.title}>Order Placed!</Text>
        <Text style={styles.message}>
          Your order has been successfully placed and will be delivered soon.
        </Text>
        {orderId && (
          <Text style={styles.orderId}>Order ID: #{orderId.substring(0, 8).toUpperCase()}</Text>
        )}

        <TouchableOpacity
          style={styles.ordersBtn}
          onPress={() => {
            // Pop back to Main and switch to Orders tab
            navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Orders' } }] });
          }}
        >
          <Text style={styles.ordersBtnText}>View My Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shopBtn}
          onPress={() => {
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
          }}
        >
          <Text style={styles.shopBtnText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  icon: { fontSize: 80, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  message: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 15, lineHeight: 24 },
  orderId: { fontSize: 14, color: '#888', marginBottom: 35, fontFamily: 'monospace' },
  ordersBtn: { backgroundColor: '#0066cc', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 8, width: '100%', alignItems: 'center', marginBottom: 12 },
  ordersBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  shopBtn: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 8, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#0066cc' },
  shopBtnText: { color: '#0066cc', fontSize: 16, fontWeight: 'bold' },
});
