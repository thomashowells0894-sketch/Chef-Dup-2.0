import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

const TOAST_TYPES = {
  success: { bg: 'rgba(0, 230, 118, 0.15)', border: 'rgba(0, 230, 118, 0.3)', text: Colors.success },
  error: { bg: 'rgba(255, 82, 82, 0.15)', border: 'rgba(255, 82, 82, 0.3)', text: Colors.error },
  info: { bg: 'rgba(0, 212, 255, 0.15)', border: 'rgba(0, 212, 255, 0.3)', text: Colors.primary },
  warning: { bg: 'rgba(255, 179, 0, 0.15)', border: 'rgba(255, 179, 0, 0.3)', text: Colors.warning },
};

export default function Toast({ visible, message, type = 'success', duration = 2500, onDismiss, icon: Icon }) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });

      // Auto dismiss
      const timer = setTimeout(() => {
        translateY.value = withTiming(-100, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
        setTimeout(() => onDismiss?.(), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const colors = TOAST_TYPES[type] || TOAST_TYPES.info;

  return (
    <ReAnimated.View style={[styles.container, animStyle]}>
      <View style={[styles.toast, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        {Icon && <Icon size={18} color={colors.text} />}
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      </View>
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  message: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
