import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Crown, Mic, ScanBarcode, TrendingUp } from 'lucide-react-native';
import GlassCard from './ui/GlassCard';
import {
  BorderRadius,
  Colors,
  FontSize,
  FontWeight,
  Spacing,
} from '../constants/theme';

const Benefit = memo(function Benefit({ icon: Icon, label }) {
  return (
    <View style={styles.benefitRow}>
      <Icon size={14} color={Colors.primary} strokeWidth={2.4} />
      <Text style={styles.benefitText}>{label}</Text>
    </View>
  );
});

function UpgradeMomentumCard({ onPress }) {
  return (
    <GlassCard style={styles.card} glow>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Crown size={18} color={Colors.warning} strokeWidth={2.2} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>After Value</Text>
            <Text style={styles.title}>Upgrade for more speed and insight</Text>
          </View>
        </View>
      </View>

      <Text style={styles.body}>
        You have already logged enough to feel the core loop. Pro cuts more time out of capture and gives you a clearer read on the day.
      </Text>

      <View style={styles.benefits}>
        <Benefit icon={Mic} label="Voice logging for faster capture" />
        <Benefit icon={ScanBarcode} label="Premium scan and shortcut workflows" />
        <Benefit icon={TrendingUp} label="Deeper progress and coaching insight" />
      </View>

      <Pressable onPress={onPress} style={styles.ctaWrap}>
        <LinearGradient
          colors={[Colors.warning, '#F59E0B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>See Pro</Text>
          <ChevronRight size={18} color="#1B1300" strokeWidth={2.5} />
        </LinearGradient>
      </Pressable>
    </GlassCard>
  );
}

export default memo(UpgradeMomentumCard);

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: 2,
  },
  body: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  benefits: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  benefitText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#1B1300',
  },
});
