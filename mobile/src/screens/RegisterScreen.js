import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);

  const handleRegister = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password.trim() || !phone.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.toLowerCase().trim(), password, phone.trim());
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.logoIcon}>✨</Text>
            <Text style={styles.logoText}>Join ShopEasy</Text>
            <Text style={styles.tagline}>Create an account & start shopping!</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {[
              { label: 'Full Name', icon: '👤', value: name, set: setName, placeholder: 'John Doe', keyboard: 'default' },
              { label: 'Email Address', icon: '📧', value: email, set: setEmail, placeholder: 'you@example.com', keyboard: 'email-address' },
              { label: 'Phone Number', icon: '📞', value: phone, set: setPhone, placeholder: '+91 9999999999', keyboard: 'phone-pad' },
            ].map(({ label, icon, value, set, placeholder, keyboard }) => (
              <View key={label}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>{icon}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    value={value}
                    onChangeText={set}
                    keyboardType={keyboard}
                    autoCapitalize={keyboard === 'default' ? 'words' : 'none'}
                    placeholderTextColor="#bbb"
                  />
                </View>
              </View>
            ))}

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Min. 6 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                placeholderTextColor="#bbb"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Text style={styles.showPass}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginLinkText}>
                Already have an account? <Text style={{ color: '#6366f1', fontWeight: '700' }}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6366f1' },
  scroll: { flexGrow: 1 },
  header: { alignItems: 'center', paddingTop: 30, paddingBottom: 24, position: 'relative' },
  backBtn: { position: 'absolute', left: 16, top: 30, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  logoIcon: { fontSize: 48, marginBottom: 6 },
  logoText: { fontSize: 26, fontWeight: '900', color: '#fff' },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: { flex: 1, backgroundColor: '#f8f9ff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 28, paddingTop: 28 },
  title: { fontSize: 24, fontWeight: '800', color: '#1a1a2e', marginBottom: 20 },
  errorBox: { backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '700', color: '#1a1a2e', marginBottom: 8, marginTop: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 14, borderWidth: 1.5, borderColor: '#e8e8f0' },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#1a1a2e', paddingVertical: 12 },
  showPass: { fontSize: 18, padding: 4 },
  button: { backgroundColor: '#6366f1', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 10, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonDisabled: { backgroundColor: '#a5b4fc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  loginLink: { alignItems: 'center', marginTop: 20, marginBottom: 10 },
  loginLinkText: { color: '#888', fontSize: 14 },
});
