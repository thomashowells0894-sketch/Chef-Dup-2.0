import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Gradients } from '../constants/theme';
import { globalRateLimiter } from '../lib/security';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    const rateLimitResult = globalRateLimiter.check('forgot_password', 3, 60000);
    if (!rateLimitResult.allowed) {
      Alert.alert('Too many attempts', 'Too many attempts. Please try again in a minute.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: 'vibefit://update-password',
      });

      if (error) {
        // Don't reveal whether email exists — always show success
        if (__DEV__) console.error('[ForgotPassword] Reset error:', error.message);
      }

      // Always show the same message to prevent email enumeration
      Alert.alert(
        'Check your email',
        'If an account exists with this email, we have sent you a password reset link.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <ArrowLeft size={24} color={Colors.text} />
      </TouchableOpacity>

      <Text style={styles.header}>Reset Password</Text>
      <Text style={styles.subHeader}>
        Enter your email and we'll send you a link to reset your password.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput 
          style={styles.input} 
          placeholder="name@example.com" 
          placeholderTextColor={Colors.inputPlaceholder}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={handleReset} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.resetButtonText}>Send Reset Link</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 60, paddingHorizontal: Spacing.lg },
  backButton: { marginBottom: Spacing.lg },
  header: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  subHeader: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl, lineHeight: 22 },
  inputGroup: { marginBottom: Spacing.lg },
  label: { color: Colors.text, marginBottom: Spacing.sm, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  input: {
    backgroundColor: Colors.inputBackground,
    color: Colors.text,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  resetButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  resetButtonText: { color: Colors.background, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});

