import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { hapticImpact } from '../lib/haptics';
import ReAnimated, { FadeInUp, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Colors, Gradients, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../constants/theme';

WebBrowser.maybeCompleteAuthSession();

// Rate limiting constants
const RATE_LIMIT_COOLDOWN_MS = 3000;
const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
const LOCKOUT_DURATION_MS = 60000;

// Glowing input component with focus state
function GlassInput({ icon: Icon, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoComplete, autoCapitalize, testID }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[
      styles.inputContainer,
      focused && styles.inputContainerFocused,
    ]}>
      <View style={styles.inputIcon}>
        <Icon size={18} color={focused ? Colors.primary : Colors.textTertiary} />
      </View>
      <TextInput
        testID={testID}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {focused && <View style={styles.inputGlowDot} />}
    </View>
  );
}

// Pulsing neon button
function NeonButton({ onPress, loading, disabled, label, testID }) {
  const glowScale = useSharedValue(1);

  useEffect(() => {
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [glowScale]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: 0.6,
  }));

  const handlePress = async () => {
    await hapticImpact();
    onPress?.();
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled}
      style={styles.buttonOuter}
    >
      {/* Neon glow aura */}
      {!disabled && (
        <ReAnimated.View style={[styles.buttonGlow, glowStyle]} />
      )}
      <LinearGradient
        colors={disabled ? Gradients.disabled : Gradients.electric}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.button, disabled && styles.buttonDisabled]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.buttonText}>{label}</Text>
            <ArrowRight size={20} color="#fff" strokeWidth={2.5} />
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const { signIn, signUp } = useAuth();

  // Rate limiting state
  const lastAttemptTime = useRef(0);
  const attemptCount = useRef(0);
  const lockoutUntil = useRef(0);

  // Check if currently rate limited
  const checkRateLimit = useCallback(() => {
    const now = Date.now();

    // Check for lockout
    if (lockoutUntil.current > now) {
      const remaining = Math.ceil((lockoutUntil.current - now) / 1000);
      setCooldownRemaining(remaining);
      setIsRateLimited(true);
      return false;
    }

    // Check for cooldown
    if (now - lastAttemptTime.current < RATE_LIMIT_COOLDOWN_MS) {
      const remaining = Math.ceil((RATE_LIMIT_COOLDOWN_MS - (now - lastAttemptTime.current)) / 1000);
      setCooldownRemaining(remaining);
      setIsRateLimited(true);

      // Auto-clear rate limit after cooldown
      setTimeout(() => {
        setIsRateLimited(false);
        setCooldownRemaining(0);
      }, remaining * 1000);

      return false;
    }

    return true;
  }, []);

  // Record attempt for rate limiting
  const recordAttempt = useCallback(() => {
    const now = Date.now();
    lastAttemptTime.current = now;
    attemptCount.current += 1;

    // Check if we should lockout
    if (attemptCount.current >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
      lockoutUntil.current = now + LOCKOUT_DURATION_MS;
      attemptCount.current = 0;
      Alert.alert(
        'Too Many Attempts',
        'Please wait 1 minute before trying again.'
      );
    }

    // Set cooldown
    setIsRateLimited(true);
    setCooldownRemaining(Math.ceil(RATE_LIMIT_COOLDOWN_MS / 1000));

    setTimeout(() => {
      if (lockoutUntil.current <= Date.now()) {
        setIsRateLimited(false);
        setCooldownRemaining(0);
      }
    }, RATE_LIMIT_COOLDOWN_MS);
  }, []);

  // OAuth login function
  const performOAuth = async (provider) => {
    try {
      const redirectUrl = makeRedirectUri({
        scheme: 'fueliq',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
    } catch (error) {
      if (__DEV__) console.error('OAuth Error:', error);
      Alert.alert('Sign In Failed', 'Unable to complete sign in. Please try again.');
    }
  };

  // Handle forgot password
  const handleResetPassword = async () => {
    if (!email || !email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address first.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: 'fueliq://auth/reset-password',
      });

      if (error) {
        // Always show success message for password reset to prevent email enumeration
        if (__DEV__) console.error('[Auth] Reset password error:', error.message);
      }
      // Random delay to prevent timing-based account enumeration
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
      // Always show the same message whether email exists or not
      Alert.alert(
        'Check Your Email',
        'We sent you a password reset link. Please check your inbox.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Check rate limiting first
    if (!checkRateLimit()) {
      return;
    }

    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (isSignUp) {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (!hasUpper || !hasLower || !hasNumber) {
        Alert.alert('Weak Password', 'Password must contain at least one uppercase letter, one lowercase letter, and one number.');
        return;
      }
    }

    // Record the attempt for rate limiting
    recordAttempt();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email.trim().toLowerCase(), password);
        if (error) {
          // Generic message to prevent account enumeration
          Alert.alert('Sign Up Failed', 'Unable to create account. Please check your details and try again.');
          if (__DEV__) console.error('[Auth] Sign up error:', error.message);
        } else {
          Alert.alert(
            'Check Your Email',
            'We sent you a confirmation link. Please verify your email to continue.'
          );
          // Reset attempt count on successful signup request
          attemptCount.current = 0;
        }
      } else {
        const { error } = await signIn(email.trim().toLowerCase(), password);
        if (error) {
          // Generic message — never reveal whether email exists or password is wrong
          Alert.alert('Sign In Failed', 'Invalid email or password. Please try again.');
          if (__DEV__) console.error('[Auth] Sign in error:', error.message);
        } else {
          // Reset attempt count on successful login
          attemptCount.current = 0;
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }

    setLoading(false);
  };

  const buttonLabel = isRateLimited
    ? `Wait ${cooldownRemaining}s...`
    : isSignUp
      ? 'Create Account'
      : 'Sign In';

  return (
    <ScreenWrapper edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Logo + Tagline */}
        <ReAnimated.View
          entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}
          style={styles.header}
        >
          <View style={styles.logoRow}>
            <Sparkles size={28} color={Colors.primary} />
            <Text style={styles.logo}>FuelIQ</Text>
          </View>
          <Text style={styles.tagline}>Your fitness journey starts here</Text>
        </ReAnimated.View>

        {/* Glass Card — the main form */}
        <ReAnimated.View
          entering={FadeInUp.delay(150).springify().mass(0.5).damping(10)}
          style={styles.cardOuter}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={90} tint="dark" style={styles.blurFill}>
              <View style={styles.cardInner}>
                <FormContent
                  isSignUp={isSignUp}
                  setIsSignUp={setIsSignUp}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  loading={loading}
                  isRateLimited={isRateLimited}
                  buttonLabel={buttonLabel}
                  handleSubmit={handleSubmit}
                  handleResetPassword={handleResetPassword}
                  performOAuth={performOAuth}
                />
              </View>
            </BlurView>
          ) : (
            <View style={[styles.cardInner, styles.cardAndroid]}>
              <FormContent
                isSignUp={isSignUp}
                setIsSignUp={setIsSignUp}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                loading={loading}
                isRateLimited={isRateLimited}
                buttonLabel={buttonLabel}
                handleSubmit={handleSubmit}
                handleResetPassword={handleResetPassword}
                performOAuth={performOAuth}
              />
            </View>
          )}
          {/* Glass border overlay */}
          <View style={styles.cardBorder} />
        </ReAnimated.View>

        {/* Footer toggle */}
        <ReAnimated.View
          entering={FadeInUp.delay(300).springify().mass(0.5).damping(10)}
        >
          <Text style={styles.footer}>
            {isSignUp
              ? 'Already have an account? '
              : "Don't have an account? "}
            <Text
              style={styles.footerLink}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Sign In' : 'Create one'}
            </Text>
          </Text>
        </ReAnimated.View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

// Extracted form content to share between iOS (BlurView) and Android
function FormContent({ isSignUp, setIsSignUp, email, setEmail, password, setPassword, loading, isRateLimited, buttonLabel, handleSubmit, handleResetPassword, performOAuth }) {
  return (
    <>
      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, !isSignUp && styles.tabActive]}
          onPress={() => setIsSignUp(false)}
        >
          <Text style={[styles.tabText, !isSignUp && styles.tabTextActive]}>
            Sign In
          </Text>
          {!isSignUp && <View style={styles.tabIndicator} />}
        </Pressable>
        <Pressable
          style={[styles.tab, isSignUp && styles.tabActive]}
          onPress={() => setIsSignUp(true)}
        >
          <Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>
            Create Account
          </Text>
          {isSignUp && <View style={styles.tabIndicator} />}
        </Pressable>
      </View>

      {/* Inputs */}
      <View style={styles.form}>
        <GlassInput
          testID="email-input"
          icon={Mail}
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <GlassInput
          testID="password-input"
          icon={Lock}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        {/* Forgot Password */}
        {!isSignUp && (
          <Pressable
            style={styles.forgotPasswordContainer}
            onPress={handleResetPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </Pressable>
        )}

        {/* Submit button */}
        <NeonButton
          testID={isSignUp ? 'sign-up-button' : 'sign-in-button'}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || isRateLimited}
          label={buttonLabel}
        />

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* OAuth */}
        <Pressable
          style={styles.oauthButtonGoogle}
          onPress={() => performOAuth('google')}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.oauthGoogleText }}>G</Text>
          <Text style={styles.oauthButtonTextGoogle}>Continue with Google</Text>
        </Pressable>

        <Pressable
          style={styles.oauthButtonApple}
          onPress={() => performOAuth('apple')}
        >
          <Text style={{ fontSize: 20, color: Colors.oauthAppleText }}>{'\uF8FF'}</Text>
          <Text style={styles.oauthButtonTextApple}>Continue with Apple</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logo: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.black,
    color: Colors.text,
    letterSpacing: -2,
  },
  tagline: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    letterSpacing: 0.3,
  },

  // Glass Card
  cardOuter: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  blurFill: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  cardInner: {
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  cardAndroid: {
    backgroundColor: 'rgba(10, 10, 14, 0.92)',
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    pointerEvents: 'none',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  tabActive: {},
  tabText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: FontWeight.semibold,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 40,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },

  // Form
  form: {
    gap: Spacing.md,
  },

  // Inputs — Glass style
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    height: 52,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0, 212, 255, 0.06)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  inputIcon: {
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    height: '100%',
  },
  inputGlowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },

  // Forgot password
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.xs,
  },
  forgotPasswordText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },

  // Neon button
  buttonOuter: {
    marginTop: Spacing.sm,
    borderRadius: 14,
    position: 'relative',
  },
  buttonGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    top: 4,
    bottom: -4,
    left: 8,
    right: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
  },
  buttonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  footerLink: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },

  // OAuth
  oauthButtonGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#fff',
    gap: Spacing.sm,
  },
  oauthButtonTextGoogle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#000',
  },
  oauthButtonApple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: Spacing.sm,
  },
  oauthButtonTextApple: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
});
