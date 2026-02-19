import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Gradients } from '../constants/theme';

export default function EmptyState({
  icon: Icon,
  iconColor = Colors.primary,
  title,
  subtitle,
  actionLabel,
  onAction,
  delay = 0,
}) {
  return (
    <ReAnimated.View entering={FadeInDown.delay(delay).springify().damping(12)} style={styles.container}>
      {Icon && (
        <View style={[styles.iconCircle, { backgroundColor: `${iconColor}15` }]}>
          <Icon size={40} color={iconColor} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Pressable style={styles.actionButton} onPress={onAction}>
          <LinearGradient colors={Gradients.primary} style={styles.actionGradient}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </LinearGradient>
        </Pressable>
      )}
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg },
  iconCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.md },
  actionButton: { marginTop: Spacing.lg, borderRadius: BorderRadius.full, overflow: 'hidden' },
  actionGradient: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.full },
  actionText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
});
