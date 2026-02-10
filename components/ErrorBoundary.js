/**
 * ErrorBoundary Component - Enterprise Grade
 *
 * Catches React errors and displays a polite fallback UI
 * instead of the white screen of death.
 *
 * Features:
 * - Catches render errors, lifecycle errors, and errors in constructors
 * - Shows a user-friendly error screen
 * - Provides retry functionality
 * - Logs errors for debugging (without sensitive data)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react-native';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error without sensitive data
    if (__DEV__) {
      console.error('[ErrorBoundary] Caught error:', error.message);
      if (__DEV__) console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);
    }

    this.setState({ errorInfo });

    // In production, you would send this to an error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleGoHome = () => {
    // Reset state and try to navigate home
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });

    // If there's an onReset prop, call it
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <LinearGradient
            colors={Gradients.background}
            style={StyleSheet.absoluteFill}
          />

          {/* Decorative error glow */}
          <View style={styles.glowContainer}>
            <LinearGradient
              colors={['rgba(255, 82, 82, 0.2)', 'rgba(255, 82, 82, 0)']}
              style={styles.glow}
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Error Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#FF5252', '#FF1744']}
                style={styles.iconGradient}
              >
                <AlertTriangle size={48} color="#fff" strokeWidth={2} />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              We're sorry, but something unexpected happened.
              {'\n'}Please try again.
            </Text>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Pressable style={styles.primaryButton} onPress={this.handleRetry}>
                <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <RefreshCw size={20} color="#fff" />
                  <Text style={styles.buttonText}>Try Again</Text>
                </LinearGradient>
              </Pressable>

              {this.props.onReset && (
                <Pressable style={styles.secondaryButton} onPress={this.handleGoHome}>
                  <Home size={20} color={Colors.textSecondary} />
                  <Text style={styles.secondaryButtonText}>Go Home</Text>
                </Pressable>
              )}
            </View>

            {/* Error Details (Dev Only) */}
            {__DEV__ && (
              <View style={styles.devSection}>
                <Pressable
                  style={styles.detailsToggle}
                  onPress={this.toggleDetails}
                >
                  <Bug size={16} color={Colors.textTertiary} />
                  <Text style={styles.detailsToggleText}>
                    {this.state.showDetails ? 'Hide' : 'Show'} Error Details
                  </Text>
                </Pressable>

                {this.state.showDetails && (
                  <View style={styles.detailsContainer}>
                    <Text style={styles.detailsLabel}>Error:</Text>
                    <Text style={styles.detailsText}>
                      {this.state.error?.message || 'Unknown error'}
                    </Text>

                    {this.state.errorInfo?.componentStack && (
                      <>
                        <Text style={styles.detailsLabel}>Component Stack:</Text>
                        <ScrollView
                          style={styles.stackScroll}
                          horizontal
                          showsHorizontalScrollIndicator
                        >
                          <Text style={styles.stackText}>
                            {this.state.errorInfo.componentStack}
                          </Text>
                        </ScrollView>
                      </>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Help Text */}
            <Text style={styles.helpText}>
              If this problem persists, please restart the app.
              {'\n'}Your data is safe.
            </Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  glowContainer: {
    position: 'absolute',
    top: -100,
    left: '50%',
    marginLeft: -150,
    width: 300,
    height: 300,
  },
  glow: {
    width: '100%',
    height: '100%',
    borderRadius: 150,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  iconContainer: {
    marginBottom: Spacing.xl,
    ...Shadows.glowError,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.glowPrimary,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    gap: Spacing.sm,
  },
  buttonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  devSection: {
    width: '100%',
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailsToggleText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  detailsContainer: {
    marginTop: Spacing.md,
  },
  detailsLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.error,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  detailsText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  stackScroll: {
    maxHeight: 150,
    backgroundColor: Colors.surfaceGlassDark,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  stackText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  helpText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ErrorBoundary;
