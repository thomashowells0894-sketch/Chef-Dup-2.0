import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, RotateCcw, ScanBarcode, Sparkles } from 'lucide-react-native';
import GlassCard from './ui/GlassCard';
import {
  BorderRadius,
  Colors,
  FontSize,
  FontWeight,
  Spacing,
} from '../constants/theme';

function getStageContent(stage) {
  switch (stage) {
    case 'first_barcode':
      return {
        stepLabel: 'Step 2 of 3',
        title: 'Scan one packaged food to build trust fast',
        body: 'One successful scan proves packaged logging is fast, accurate, and easier to repeat all week.',
        ctaLabel: 'Scan barcode',
        ctaIcon: ScanBarcode,
        ctaGradient: ['#64D2FF', Colors.primary],
      };
    case 'repeat_log':
      return {
        stepLabel: 'Step 3 of 3',
        title: 'Repeat something you actually eat',
        body: 'Use recents or yesterday once, and the wedge becomes obvious: repeating beats typing from scratch.',
        ctaLabel: 'Open repeat log',
        ctaIcon: RotateCcw,
        ctaGradient: ['#34D399', '#10B981'],
      };
    case 'first_meal':
    default:
      return {
        stepLabel: 'Step 1 of 3',
        title: 'Get one real meal in',
        body: 'After the first honest log, the app stops guessing and starts helping with repeats, search, and daily guidance.',
        ctaLabel: 'Log first meal',
        ctaIcon: Sparkles,
        ctaGradient: [Colors.primary, Colors.primaryDim],
      };
  }
}

const ProgressPill = memo(function ProgressPill({ active, label }) {
  return (
    <View style={[styles.progressPill, active && styles.progressPillActive]}>
      <Text style={[styles.progressPillText, active && styles.progressPillTextActive]}>
        {label}
      </Text>
    </View>
  );
});

function ActivationCard({ stage, progress = 0, onPrimaryPress }) {
  const content = useMemo(() => getStageContent(stage), [stage]);
  const CtaIcon = content.ctaIcon;

  return (
    <GlassCard style={styles.card} glow>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Activation</Text>
        <Text style={styles.progressText}>{progress}/3 done</Text>
      </View>

      <Text style={styles.stepLabel}>{content.stepLabel}</Text>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.body}>{content.body}</Text>

      <View style={styles.progressRow}>
        <ProgressPill active={progress >= 1} label="First meal" />
        <ProgressPill active={progress >= 2} label="Barcode" />
        <ProgressPill active={progress >= 3} label="Repeat" />
      </View>

      <Pressable onPress={onPrimaryPress} style={styles.ctaWrap}>
        <LinearGradient
          colors={content.ctaGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaGradient}
        >
          <View style={styles.ctaLeft}>
            <CtaIcon size={18} color="#041015" strokeWidth={2.4} />
            <Text style={styles.ctaLabel}>{content.ctaLabel}</Text>
          </View>
          <ChevronRight size={18} color="#041015" strokeWidth={2.5} />
        </LinearGradient>
      </Pressable>
    </GlassCard>
  );
}

export default memo(ActivationCard);

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  eyebrow: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  progressText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  stepLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  progressPill: {
    flex: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  progressPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  progressPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  progressPillTextActive: {
    color: Colors.success,
    fontWeight: FontWeight.semibold,
  },
  ctaWrap: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  ctaGradient: {
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ctaLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#041015',
  },
});
