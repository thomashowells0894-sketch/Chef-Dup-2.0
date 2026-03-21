import '../lib/i18n';
import { useEffect, useCallback, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, Text, AppState, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import { useFonts } from 'expo-font';
import {
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
import { getRouteForNotificationData } from '../lib/notificationRoutes';
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
import TrialExpirationBanner from '../components/TrialExpirationBanner';
import WinBackOffer from '../components/WinBackOffer';
import { useWinBack } from '../hooks/useWinBack';
import { recordStartupCheckpoint } from '../lib/startupTrace';

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

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppBootstrapScreen({ title, subtitle }) {
  return (
    <View style={bootstrapStyles.root}>
      <StatusBar style="light" />
      <View style={bootstrapStyles.logoWrap}>
        <Text style={bootstrapStyles.logoMark}>FuelIQ</Text>
        <Text style={bootstrapStyles.title}>{title}</Text>
        <Text style={bootstrapStyles.subtitle}>{subtitle}</Text>
      </View>
      <View style={bootstrapStyles.dotsRow}>
        <View style={[bootstrapStyles.dot, bootstrapStyles.dotPrimary]} />
        <View style={bootstrapStyles.dot} />
        <View style={bootstrapStyles.dot} />
      </View>
    </View>
  );
}

// Inner navigation component that handles profile-based routing
function ProfileAwareNav() {
  const { user } = useAuth();
  const {
    hasCompletedOnboarding,
    profileHydrationState,
    isHydrated,
    isLoading,
  } = useProfile();
  const segments = useSegments();
  const router = useRouter();
  const { offer: winBackOffer, dismissOffer: dismissWinBack } = useWinBack();

  useEffect(() => {
    if (!isHydrated || isLoading) return;

    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';
    const shouldRouteToOnboarding =
      !hasCompletedOnboarding && profileHydrationState !== 'complete';

    if (shouldRouteToOnboarding && inTabs) {
      router.replace('/onboarding');
    }
    else if (!shouldRouteToOnboarding && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [hasCompletedOnboarding, isHydrated, isLoading, profileHydrationState, router, segments]);

  const handleWinBackAccept = useCallback(() => {
    dismissWinBack();
    router.push('/settings');
  }, [dismissWinBack, router]);

  if (user && (!isHydrated || isLoading)) {
    return (
      <AppBootstrapScreen
        title="Restoring your plan"
        subtitle="Bringing back your targets and today"
      />
    );
  }

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
        {user ? <TrialExpirationBanner /> : null}
        <XPToast />
        <FastingPromptModal />
        <CelebrationOverlay />
        {user ? (
          <WinBackOffer
            offer={winBackOffer}
            onAccept={handleWinBackAccept}
            onDismiss={dismissWinBack}
          />
        ) : null}
      </View>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const { user, loading, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const appState = useRef(AppState.currentState);
  const lastHandledNotificationId = useRef(null);

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
    recordStartupCheckpoint('auth_resolved', {
      authenticated: !!user,
      segment: segments[0] || 'root',
    });

    const publicRoutes = new Set(['auth', 'forgot-password', 'update-password']);
    const inPublicRoute = publicRoutes.has(segments[0]);
    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inPublicRoute) {
      // Redirect to auth if not signed in
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      // Redirect to tabs (ProfileAwareNav will handle onboarding redirect if needed)
      router.replace('/(tabs)');
    }
  }, [loading, router, segments, user]);

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

  useEffect(() => {
    if (!user) return;

    const handleNotificationResponse = (response) => {
      const identifier = response?.notification?.request?.identifier || null;
      if (identifier && lastHandledNotificationId.current === identifier) {
        return;
      }

      const data = response?.notification?.request?.content?.data;
      const route = getRouteForNotificationData(
        data && typeof data === 'object' ? data : null
      );
      if (!route) {
        return;
      }

      lastHandledNotificationId.current = identifier;
      router.push(route);
    };

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          handleNotificationResponse(response);
        }
      })
      .catch(() => {});

    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => subscription.remove();
  }, [router, user]);

  if (loading) {
    return (
      <AppBootstrapScreen
        title="Restoring your day"
        subtitle="Last targets and shortcuts load first. Everything else can refresh in the background."
      />
    );
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
  const [fontsLoaded, fontError] = useFonts({
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

  useEffect(() => {
    if (fontError) {
      Sentry.captureException(fontError);
    }
  }, [fontError]);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <AppBootstrapScreen
        title="Starting FuelIQ"
        subtitle="Opening your nutrition coach and getting the fastest logging tools ready."
      />
    );
  }

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

// Sentry.wrap() adds a TouchEventBoundary (View with onTouchStart) that
// interferes with TextInput focus on iOS + New Architecture. Export directly
// instead — Sentry error tracking and session replay still work via init().
export default RootLayout;

const bootstrapStyles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 32,
  },
  logoWrap: {
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  dotPrimary: {
    backgroundColor: Colors.primary,
  },
});
