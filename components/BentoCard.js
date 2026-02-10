import React, { memo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { hapticLight } from '../lib/haptics';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/theme';

function BentoCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  iconColor = Colors.primary,
  size = 'normal', // 'normal', 'wide', 'tall', 'large'
  children,
  onPress,
  disabled = false,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      friction: 8,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(async () => {
    if (onPress) {
      await hapticLight();
      onPress();
    }
  }, [onPress]);

  const content = (
    <>
      <View style={styles.header}>
        {Icon && <Icon size={20} color={iconColor} strokeWidth={2} />}
        {title && <Text style={styles.title}>{title}</Text>}
      </View>
      {children ? (
        children
      ) : (
        <View style={styles.content}>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{value}</Text>
            {unit && <Text style={styles.unit}>{unit}</Text>}
          </View>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
    </>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        <Animated.View
          style={[
            styles.card,
            styles[size],
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {content}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, styles[size]]}>
      {content}
    </View>
  );
}

export default memo(BentoCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    margin: Spacing.xs,
  },
  normal: {
    flex: 1,
    minHeight: 100,
  },
  wide: {
    flex: 2,
    minHeight: 100,
  },
  tall: {
    flex: 1,
    minHeight: 200,
  },
  large: {
    flex: 2,
    minHeight: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  unit: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
