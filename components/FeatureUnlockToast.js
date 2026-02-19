import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Unlock, X } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

export default function FeatureUnlockToast({ feature, onDismiss }) {
  if (!feature) return null;

  return (
    <Animated.View entering={FadeInDown.duration(400)} exiting={FadeOutDown.duration(300)} style={styles.container}>
      <View style={styles.iconWrap}>
        <Unlock size={18} color={Colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Feature Unlocked!</Text>
        <Text style={styles.featureName}>{feature.title}</Text>
        <Text style={styles.description}>{feature.description}</Text>
      </View>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <X size={16} color={Colors.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  title: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  featureName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 2 },
  description: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
});
