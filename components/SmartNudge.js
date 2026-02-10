/**
 * SmartNudge - Contextual nudge card with time-aware, data-aware messages.
 * Glass card with sparkles icon, title, body, and optional action button.
 */
import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

const SmartNudge = memo(function SmartNudge({ title, body, actionLabel, onAction, icon: Icon, iconColor }) {
  const NudgeIcon = Icon || Sparkles;
  const color = iconColor || Colors.primary;

  return (
    <ReAnimated.View entering={FadeInDown.springify().damping(14)} style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
          <NudgeIcon size={18} color={color} strokeWidth={2.5} />
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {actionLabel && onAction && (
            <Pressable onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.actionText}>{actionLabel}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ReAnimated.View>
  );
});

export default SmartNudge;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  body: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  actionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
});
