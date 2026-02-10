import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../../lib/haptics';
import { Colors, Gradients, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants/theme';

/**
 * Premium GlassHeader Component
 * A frosted glass navigation header with blur effect
 */
export default function GlassHeader({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  rightIcon2,
  onLeftPress,
  onRightPress,
  onRight2Press,
  transparent = false,
  floating = false,
  children,
}) {
  const insets = useSafeAreaInsets();

  const handlePress = async (callback) => {
    if (!callback) return;
    await hapticLight();
    callback();
  };

  const HeaderContent = (
    <View style={[styles.headerContent, { paddingTop: floating ? Spacing.md : insets.top + Spacing.sm }]}>
      <View style={styles.headerRow}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          {leftIcon && (
            <Pressable
              style={styles.iconButton}
              onPress={() => handlePress(onLeftPress)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {leftIcon}
            </Pressable>
          )}
        </View>

        {/* Center Section */}
        <View style={styles.centerSection}>
          {title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          {rightIcon2 && (
            <Pressable
              style={styles.iconButton}
              onPress={() => handlePress(onRight2Press)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {rightIcon2}
            </Pressable>
          )}
          {rightIcon && (
            <Pressable
              style={styles.iconButton}
              onPress={() => handlePress(onRightPress)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {rightIcon}
            </Pressable>
          )}
        </View>
      </View>

      {/* Custom Children (like search bar, filters, etc.) */}
      {children && <View style={styles.childrenContainer}>{children}</View>}
    </View>
  );

  if (transparent) {
    return (
      <View style={[styles.container, floating && styles.floating]}>
        {HeaderContent}
      </View>
    );
  }

  // Use BlurView on iOS, LinearGradient fallback on Android
  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.container, floating && styles.floating]}>
        <BlurView intensity={80} tint="dark" style={styles.blur}>
          <LinearGradient
            colors={['rgba(10, 10, 12, 0.7)', 'rgba(10, 10, 12, 0.5)']}
            style={styles.gradientOverlay}
          />
          {HeaderContent}
        </BlurView>
        <View style={styles.borderBottom} />
      </View>
    );
  }

  // Android fallback
  return (
    <View style={[styles.container, floating && styles.floating]}>
      <LinearGradient
        colors={Gradients.header}
        style={styles.androidGradient}
      >
        {HeaderContent}
      </LinearGradient>
      <View style={styles.borderBottom} />
    </View>
  );
}

/**
 * Compact variant for inline headers within screens
 */
export function GlassHeaderCompact({ title, subtitle, rightContent, style }) {
  return (
    <View style={[styles.compactContainer, style]}>
      <View style={styles.compactLeft}>
        <Text style={styles.compactTitle}>{title}</Text>
        {subtitle && <Text style={styles.compactSubtitle}>{subtitle}</Text>}
      </View>
      {rightContent && <View style={styles.compactRight}>{rightContent}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  floating: {
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  androidGradient: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  childrenContainer: {
    marginTop: Spacing.sm,
  },
  borderBottom: {
    height: 1,
    backgroundColor: Colors.border,
  },
  // Compact variant styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  compactLeft: {
    flex: 1,
  },
  compactTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  compactSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
