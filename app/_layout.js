import { useEffect, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/theme';
import { AuthProvider, useAuth } from '../context/AuthContext';
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
import ErrorBoundary from '../components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

// Inner navigation component that handles profile-based routing
function ProfileAwareNav() {
  const { isProfileComplete, isHydrated, isLoading } = useProfile();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait for profile to be hydrated (fetched from Supabase)
    if (!isHydrated || isLoading) return;

    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    // DISABLED: Automatic redirect was causing a loop after profile save
    // If profile is incomplete and user is trying to access main app, redirect to onboarding
    // if (!isProfileComplete && inTabs) {
    //   router.replace('/onboarding');
    // }
    // If profile is complete and user is on onboarding, redirect to main app
    // else if (isProfileComplete && inOnboarding) {
    //   router.replace('/(tabs)');
    // }
  }, [isProfileComplete, isHydrated, isLoading, segments]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      />
      <XPToast />
      <FastingPromptModal />
    </View>
  );
}

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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

  if (loading) {
    return null;
  }

  return (
    <ProfileProvider>
      <SubscriptionProvider>
        <GamificationProvider>
          <OfflineProvider>
            <NotificationProvider>
              <DashboardLayoutProvider>
                <FoodProvider>
                  <FastingProvider>
                    <MoodProvider>
                      <ProfileAwareNav />
                    </MoodProvider>
                  </FastingProvider>
                </FoodProvider>
              </DashboardLayoutProvider>
            </NotificationProvider>
          </OfflineProvider>
        </GamificationProvider>
      </SubscriptionProvider>
    </ProfileProvider>
  );
}

export default function RootLayout() {
  const handleErrorReset = useCallback(() => {
    // This will be called when user taps "Go Home" in error boundary
    // The error boundary will reset and try to re-render
  }, []);

  return (
    <ErrorBoundary onReset={handleErrorReset}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ErrorBoundary>
  );
}
