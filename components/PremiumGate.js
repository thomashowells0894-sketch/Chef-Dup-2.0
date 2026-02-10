/**
 * PremiumGate Component
 *
 * Wraps premium features and redirects non-subscribers to the paywall.
 * Shows a brief loading state while checking subscription status.
 */

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useIsPremium } from '../context/SubscriptionContext';

export default function PremiumGate({ children }) {
  const router = useRouter();
  const { isPremium, isLoading } = useIsPremium();

  useEffect(() => {
    // Once loading is complete, redirect non-premium users
    if (!isLoading && !isPremium) {
      // Replace current route with paywall
      router.replace('/paywall');
    }
  }, [isPremium, isLoading, router]);

  // Show loading while checking subscription
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // If not premium, show nothing (redirect will happen)
  if (!isPremium) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // User is premium, show the content
  return children;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
