import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import {
  consumeSupabaseAuthRedirect,
  parseSupabaseAuthRedirect,
} from '../lib/authRedirect';
import {
  BorderRadius,
  Colors,
  FontSize,
  FontWeight,
  Spacing,
} from '../constants/theme';

function validatePassword(password) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasNumber) {
    return 'Password must include an uppercase letter, a lowercase letter, and a number.';
  }

  return null;
}

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPreparing, setIsPreparing] = useState(true);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const lastHandledUrl = useRef(null);

  const handleIncomingUrl = useCallback(async (url) => {
    if (!url || lastHandledUrl.current === url) {
      return false;
    }

    lastHandledUrl.current = url;

    const parsed = parseSupabaseAuthRedirect(url);
    if (parsed.type && parsed.type !== 'recovery') {
      setIsRecoveryReady(false);
      setLinkError('This password reset link is not valid for recovery.');
      setIsPreparing(false);
      return true;
    }

    const { recovered, error } = await consumeSupabaseAuthRedirect(url, supabase.auth);

    setIsRecoveryReady(recovered);
    setLinkError(recovered ? null : error || 'Unable to verify this password reset link.');
    setIsPreparing(false);
    return true;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        const handled = await handleIncomingUrl(initialUrl);

        if (isMounted && !handled) {
          setIsRecoveryReady(false);
          setLinkError('Open the password reset link from your email to continue.');
          setIsPreparing(false);
        }
      } catch {
        if (isMounted) {
          setIsRecoveryReady(false);
          setLinkError('Unable to read the password reset link. Please request a new one.');
          setIsPreparing(false);
        }
      }
    };

    initialize();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingUrl(url).catch(() => {
        setIsRecoveryReady(false);
        setLinkError('Unable to verify this password reset link. Please request a new one.');
        setIsPreparing(false);
      });
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [handleIncomingUrl]);

  const handleSubmit = useCallback(async () => {
    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert('Weak Password', passwordError);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Please enter the same password twice.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert('Update Failed', error.message || 'Unable to update your password.');
        return;
      }

      Alert.alert('Password Updated', 'Your password has been updated.', [
        {
          text: 'Continue',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } catch {
      Alert.alert('Update Failed', 'Unable to update your password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [confirmPassword, password, router]);

  return (
    <SafeAreaView style={styles.container} testID="update-password-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <TouchableOpacity onPress={() => router.replace('/auth')} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.header}>Set New Password</Text>
        <Text style={styles.subHeader}>
          Finish recovery by choosing a new password for your account.
        </Text>

        {isPreparing ? (
          <View style={styles.stateCard} testID="password-reset-verifying-state">
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.stateText}>Verifying your reset link...</Text>
          </View>
        ) : null}

        {!isPreparing && !isRecoveryReady ? (
          <View style={styles.stateCard} testID="password-reset-invalid-state">
            <Text style={styles.errorTitle}>Reset Link Invalid</Text>
            <Text style={styles.errorText}>
              {linkError || 'This password reset link is invalid or has expired.'}
            </Text>
            <TouchableOpacity
              testID="request-reset-link-button"
              style={styles.secondaryButton}
              onPress={() => router.replace('/forgot-password')}
            >
              <Text style={styles.secondaryButtonText}>Request Another Link</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!isPreparing && isRecoveryReady ? (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                testID="update-password-input"
                style={styles.input}
                placeholder="Enter a new password"
                placeholderTextColor={Colors.inputPlaceholder}
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                testID="confirm-password-input"
                style={styles.input}
                placeholder="Re-enter your new password"
                placeholderTextColor={Colors.inputPlaceholder}
                secureTextEntry
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <Text style={styles.helperText}>
              Use at least 8 characters with uppercase, lowercase, and a number.
            </Text>

            <TouchableOpacity
              testID="update-password-submit"
              style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.primaryButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    marginBottom: Spacing.lg,
    alignSelf: 'flex-start',
  },
  header: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subHeader: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    color: Colors.text,
    marginBottom: Spacing.sm,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    color: Colors.text,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  helperText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  stateCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  stateText: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
  errorTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: Colors.background,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
