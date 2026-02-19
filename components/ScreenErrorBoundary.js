import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

export default class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Report to Sentry
    try {
      const Sentry = require('../lib/sentry').Sentry;
      Sentry?.captureException(error, {
        extra: {
          componentStack: errorInfo?.componentStack,
          screenName: this.props.screenName || 'unknown',
        },
      });
    } catch {}

    if (__DEV__) {
      console.error(`[ScreenError] ${this.props.screenName}:`, error);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ScreenErrorFallback
          screenName={this.props.screenName}
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}

function ScreenErrorFallback({ screenName, error, onRetry }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <AlertTriangle size={32} color={Colors.warning} />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          {screenName ? `The ${screenName} screen encountered an error.` : 'This screen encountered an error.'}{' '}
          Your data is safe.
        </Text>

        {__DEV__ && error && (
          <ScrollView style={styles.errorBox} horizontal>
            <Text style={styles.errorText}>{error.message}</Text>
          </ScrollView>
        )}

        <View style={styles.actions}>
          <Pressable style={styles.retryButton} onPress={onRetry}>
            <RefreshCw size={18} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  content: { alignItems: 'center', maxWidth: 320 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.warningSoft, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: FontSize.md * 1.5, marginBottom: Spacing.lg },
  errorBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.lg, maxHeight: 80, width: '100%' },
  errorText: { fontSize: FontSize.xs, color: Colors.error, fontFamily: 'monospace' },
  actions: { gap: Spacing.sm, width: '100%' },
  retryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  retryText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#fff' },
});
