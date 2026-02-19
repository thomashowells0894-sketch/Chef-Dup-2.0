import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Gradients } from '../constants/theme';
import { hapticLight } from '../lib/haptics';

export default function ErrorFallback({ error, resetError, title }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={['rgba(255, 82, 82, 0.15)', 'rgba(255, 82, 82, 0.05)']}
          style={styles.iconGradient}
        >
          <AlertTriangle size={48} color={Colors.error} />
        </LinearGradient>
      </View>
      <Text style={styles.title}>{title || 'Something went wrong'}</Text>
      <Text style={styles.message}>
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </Text>
      {resetError && (
        <Pressable
          style={styles.retryButton}
          onPress={async () => { await hapticLight(); resetError(); }}
        >
          <LinearGradient
            colors={Gradients.primary}
            style={styles.retryGradient}
          >
            <RefreshCw size={18} color={Colors.background} />
            <Text style={styles.retryText}>Try Again</Text>
          </LinearGradient>
        </Pressable>
      )}
      {__DEV__ && error?.stack && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <Text style={styles.debugText} numberOfLines={10}>
            {error.stack}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  retryButton: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  retryText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  debugContainer: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderRadius: BorderRadius.lg,
    width: '100%',
  },
  debugTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  debugText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
});
