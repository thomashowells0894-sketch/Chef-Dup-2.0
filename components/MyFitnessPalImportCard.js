import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Upload, ArrowRight } from 'lucide-react-native';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from '../constants/theme';

export default function MyFitnessPalImportCard({
  title = 'Switching from MyFitnessPal?',
  body = 'Import your diary instead of rebuilding meals from scratch.',
  buttonLabel = 'Import your diary',
  eyebrow = 'Switcher Path',
  onPress,
  style,
}) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Upload size={18} color={Colors.warning} strokeWidth={2.4} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
      </View>

      <Pressable onPress={onPress} style={styles.button}>
        <Text style={styles.buttonText}>{buttonLabel}</Text>
        <ArrowRight size={16} color={Colors.background} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.warning + '33',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warning + '14',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  body: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  button: {
    minHeight: 42,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  buttonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
});
