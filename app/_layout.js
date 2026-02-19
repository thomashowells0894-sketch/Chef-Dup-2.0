import '../lib/i18n';
import { useEffect, useCallback, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { Colors } from '../constants/theme';
import { isSessionExpired, recordActivity } from '../lib/security';
import { initSentry, Sentry } from '../lib/sentry';
import {
  startSession,
  endSession,
  setAnalyticsUserId,
  cleanupAnalytics,
} from '../lib/analytics';
import { recordSessionStart, recordSessionEnd } from '../lib/crashFreeRate';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ProfileProvider, useProfile } from '../context/ProfileContext';
import { OfflineProvider } from '../context/OfflineContext';
import { FoodProvider } from '../context/FoodContext';
import { FastingProvider } from '../context/FastingContext';
import { GamificationProvider } from '../context/GamificationContext';
import { MoodProvider } from '../context/MoodContext';
import { DashboardLayoutProvider } from '../context/DashboardLayoutContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { NotificationProvider } from '../context/NotificationContext';
import XPToast from '../components/XPToast';
import FastingPromptModal from '../components/FastingPromptModal';
import CelebrationOverlay from '../components/CelebrationOverlay';
import ErrorBoundary from '../components/ErrorBoundary';
import WinBackOffer from '../components/WinBackOffer';
import { useWinBack } from '../hooks/useWinBack';
import { configureNotifications, requestPermissions, scheduleMealReminders, scheduleStreakWarning, scheduleMorningBriefing } from '../services/notifications';

/**
 * Utility to compose multiple context providers without deep nesting.
 * Providers are applied in array order (first element is outermost).
 * The resulting React tree is identical to manual nesting.
 */
function ComposeProviders({ providers, children }) {
  return providers.reduceRight(
    (acc, Provider) => <Provider>{acc}</Provider>,
    children
  );
}

initSentry();

SplashScreen.preventAutoHideAsync();

// Inner navigation component that handles profile-based routing
function ProfileAwareNav() {
  const { isProfileComplete, isHydrated, isLoading } = useProfile();
  const segments = useSegments();
  const router = useRouter();
  const { offer: winBackOffer, dismissOffer: dismissWinBack } = useWinBack();

  useEffect(() => {
    // Wait for profile to be hydrated (fetched from Supabase)
    if (!isHydrated || isLoading) return;

    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    // If profile is incomplete and user is trying to access main app, redirect to onboarding
    if (!isProfileComplete && inTabs) {
      router.replace('/onboarding');
    }
    // If profile is complete and user is on onboarding, redirect to main app
    else if (isProfileComplete && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [isProfileComplete, isHydrated, isLoading, segments]);

  const handleWinBackAccept = useCallback(() => {
    dismissWinBack();
    router.push('/settings');
  }, [dismissWinBack, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'fade',
            animationDuration: 150,
          }}
        />
        <XPToast />
        <FastingPromptModal />
        <CelebrationOverlay />
        <WinBackOffer
          offer={winBackOffer}
          onAccept={handleWinBackAccept}
          onDismiss={dismissWinBack}
        />
      </View>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const { user, loading, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  // Session timeout enforcement — check on foreground resume
  useEffect(() => {
    if (!user) return;

    // Record activity on mount
    recordActivity();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground — check session validity
        if (isSessionExpired()) {
          signOut?.();
        } else {
          recordActivity();
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [user, signOut]);

  useEffect(() => {
    if (loading) return;

    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      // Redirect to auth if not signed in
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      // Redirect to tabs (ProfileAwareNav will handle onboarding redirect if needed)
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        await configureNotifications();
        const granted = await requestPermissions();
        if (granted) {
          await scheduleMealReminders({});
          await scheduleStreakWarning();
          await scheduleMorningBriefing();
        }
      } catch (e) {
        if (__DEV__) console.warn('Notification init failed:', e);
      }
    })();
  }, [user]);

  // --- Analytics session lifecycle ---
  useEffect(() => {
    if (!user) return;

    // Set the user ID for all future analytics events
    setAnalyticsUserId(user.id);

    // Start analytics + crash-free-rate sessions
    startSession();
    recordSessionStart();

    const analyticsAppSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Graceful background — mark session as clean + end analytics session
        recordSessionEnd(true);
        endSession();
      } else if (nextState === 'active') {
        // Resumed — start a fresh session
        startSession();
        recordSessionStart();
      }
    });

    return () => {
      analyticsAppSub.remove();
      // Component unmount — end sessions cleanly
      recordSessionEnd(true);
      endSession();
      cleanupAnalytics();
    };
  }, [user]);

  // Register quick action items when user is authenticated
  useEffect(() => {
    if (user) {
      QuickActions.setItems([
        { id: 'quick_cal', title: 'Quick Log', icon: 'symbol:bolt.fill' },
        { id: 'start_fasting', title: 'Start Fasting', icon: 'symbol:timer' },
        { id: 'log_water', title: 'Log Water', icon: 'symbol:drop.fill' },
      ]);
    }
  }, [user]);

  // Handle quick action callbacks
  useQuickActionCallback((action) => {
    if (!user) return;
    switch (action.id) {
      case 'quick_cal':
        router.push({ pathname: '/(tabs)/add', params: { quickCal: 'true' } });
        break;
      case 'start_fasting':
        router.push('/(tabs)');
        break;
      case 'log_water':
        router.push('/water-tracker');
        break;
    }
  });

  if (loading) {
    return null;
  }

  const providers = [
    ProfileProvider,
    SubscriptionProvider,
    GamificationProvider,
    OfflineProvider,
    NotificationProvider,
    DashboardLayoutProvider,
    FoodProvider,
    FastingProvider,
    MoodProvider,
  ];

  return (
    <ComposeProviders providers={providers}>
      <ProfileAwareNav />
    </ComposeProviders>
  );
}

function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  const handleErrorReset = useCallback(() => {
    // This will be called when user taps "Go Home" in error boundary
    // The error boundary will reset and try to re-render
  }, []);

  return (
    <ErrorBoundary onReset={handleErrorReset}>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
