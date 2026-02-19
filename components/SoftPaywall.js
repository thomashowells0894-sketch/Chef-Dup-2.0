import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Lock, Sparkles, X, Check, Users } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { useSubscription } from '../context/SubscriptionContext';
import { useRouter } from 'expo-router';
import { hapticLight, hapticMedium } from '../lib/haptics';
import { getABTestVariant } from '../lib/monetization';
import { trackConversion } from '../lib/conversionTracking';
import { SUBSCRIPTION_TIERS } from '../lib/monetization';
import TrialCountdown from './TrialCountdown';

const PRO_FEATURES = [
  'Unlimited AI food scans',
  'AI workout generation',
  'AI meal plans',
  'Advanced analytics & insights',
  'Barcode scanner',
  'AI coach chat',
];

export default function SoftPaywall({ feature, previewContent, children }) {
  const { isPremium, checkFeature, isTrialing, trialEndDate } = useSubscription();
  const [showPreview, setShowPreview] = useState(false);
  const router = useRouter();

  // ----- A/B test variant (assigned once, memoised) -----
  const [paywallVariant, setPaywallVariant] = useState('feature_rich');

  useMemo(() => {
    // Fire off the async lookup; the result is cached in AsyncStorage so
    // subsequent calls are fast.  We use useMemo so it only runs once per mount.
    let cancelled = false;
    getABTestVariant('paywall_design').then((variant) => {
      if (!cancelled && variant) setPaywallVariant(variant);
    });
    return () => { cancelled = true; };
  }, []);

  // ----- Conversion tracking: paywall_shown -----
  useEffect(() => {
    if (showPreview) {
      trackConversion({
        event: 'paywall_shown',
        source: feature || 'unknown',
        variant: paywallVariant,
      });
    }
  }, [showPreview, feature, paywallVariant]);

  const hasAccess = isPremium || checkFeature?.(feature);

  if (hasAccess) return children;

  // ----- Annual savings calculation -----
  const monthlyPrice = SUBSCRIPTION_TIERS.pro.monthlyPrice;
  const annualPrice = SUBSCRIPTION_TIERS.pro.yearlyPrice;
  const annualSavings = (monthlyPrice * 12 - annualPrice).toFixed(2);

  // ----- Handlers with tracking -----
  const handleDismiss = () => {
    trackConversion({
      event: 'paywall_dismissed',
      source: feature || 'unknown',
      variant: paywallVariant,
    });
    setShowPreview(false);
  };

  const handleUpgradeTap = () => {
    trackConversion({
      event: 'paywall_cta_tapped',
      source: feature || 'unknown',
      variant: paywallVariant,
    });
    hapticMedium?.() || hapticLight();
    setShowPreview(false);
    router.push('/settings');
  };

  // ----- Variant-specific modal body -----
  const renderVariantBody = () => {
    switch (paywallVariant) {
      case 'minimal':
        return (
          <View style={styles.variantBody}>
            <Text style={styles.modalDesc}>
              Unlock everything for just ${monthlyPrice}/mo.
            </Text>
          </View>
        );

      case 'social_proof':
        return (
          <View style={styles.variantBody}>
            <View style={styles.socialProofBadge}>
              <Users size={16} color={Colors.success} />
              <Text style={styles.socialProofText}>
                2,847 users upgraded this week
              </Text>
            </View>
            <Text style={styles.modalDesc}>
              Join thousands of users who unlocked their full potential with Pro.
            </Text>
          </View>
        );

      case 'feature_rich':
      default:
        return (
          <View style={styles.variantBody}>
            {PRO_FEATURES.map((feat) => (
              <View key={feat} style={styles.featureRow}>
                <Check size={16} color={Colors.success} />
                <Text style={styles.featureText}>{feat}</Text>
              </View>
            ))}
          </View>
        );
    }
  };

  return (
    <>
      <Pressable onPress={() => { hapticLight(); setShowPreview(true); }}>
        <View style={styles.lockedContainer}>
          {/* Show blurred/dimmed preview */}
          <View style={styles.previewWrap} pointerEvents="none">
            <View style={styles.blurOverlay}>
              {children}
            </View>
          </View>

          {/* Lock overlay */}
          <View style={styles.lockOverlay}>
            <View style={styles.lockBadge}>
              <Lock size={16} color={Colors.warning} />
              <Text style={styles.lockText}>Pro Feature</Text>
            </View>
            <Text style={styles.tapText}>Tap to preview</Text>
          </View>
        </View>
      </Pressable>

      <Modal visible={showPreview} transparent animationType="fade">
        <Animated.View entering={FadeIn.duration(200)} style={styles.modal}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.modalContent}>
            <LinearGradient
              colors={['rgba(168, 85, 247, 0.15)', 'rgba(0, 212, 255, 0.08)']}
              style={styles.modalGradient}
            >
              <Pressable style={styles.closeButton} onPress={handleDismiss} hitSlop={12}>
                <X size={20} color={Colors.textSecondary} />
              </Pressable>

              <View style={styles.modalHeader}>
                <Sparkles size={24} color={Colors.primary} />
                <Text style={styles.modalTitle}>Unlock {feature}</Text>
              </View>

              {/* Trial countdown (only when trialing) */}
              {isTrialing && trialEndDate && (
                <TrialCountdown trialEndDate={trialEndDate} />
              )}

              {previewContent && (
                <View style={styles.previewBox}>
                  {previewContent}
                </View>
              )}

              {/* Variant-specific content */}
              {renderVariantBody()}

              {/* Annual savings nudge */}
              <View style={styles.savingsRow}>
                <Sparkles size={14} color={Colors.gold} />
                <Text style={styles.savingsText}>
                  Save ${annualSavings}/year with annual
                </Text>
              </View>

              <Pressable
                style={styles.upgradeButton}
                onPress={handleUpgradeTap}
              >
                <Crown size={18} color="#fff" />
                <Text style={styles.upgradeText}>Upgrade to Pro</Text>
              </Pressable>

              <Pressable onPress={handleDismiss} style={styles.laterButton}>
                <Text style={styles.laterText}>Maybe later</Text>
              </Pressable>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  lockedContainer: { position: 'relative', overflow: 'hidden', borderRadius: BorderRadius.xl },
  previewWrap: { opacity: 0.4 },
  blurOverlay: {},
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: BorderRadius.xl,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  lockText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.warning },
  tapText: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: Spacing.sm },
  modal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: Spacing.lg },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  modalGradient: { padding: Spacing.xl, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)' },
  closeButton: { position: 'absolute', top: Spacing.md, right: Spacing.md, zIndex: 1 },
  modalHeader: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  previewBox: { marginBottom: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.lg, padding: Spacing.md },
  modalDesc: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: FontSize.md * 1.5, marginBottom: Spacing.lg },
  upgradeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md },
  upgradeText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
  laterButton: { alignItems: 'center', marginTop: Spacing.md },
  laterText: { fontSize: FontSize.sm, color: Colors.textTertiary },

  // Variant: feature_rich
  variantBody: {
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 5,
  },
  featureText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // Variant: social_proof
  socialProofBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.successSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  socialProofText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },

  // Annual savings nudge
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.goldSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  savingsText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gold,
  },
});
