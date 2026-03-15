/**
 * Paywall Screen - Premium Subscription
 *
 * Top-tier design with:
 * - Deep black glassmorphism aesthetic
 * - Electric Blue accent with glow effects
 * - Cinematic header animation
 * - Premium pricing cards
 * - Apple App Store compliant
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { hapticLight, hapticImpact, hapticSuccess } from '../lib/haptics';
import {
  X,
  CheckCircle,
  Sparkles,
  Dumbbell,
  ChefHat,
  Zap,
  CircleOff,
  Crown,
} from 'lucide-react-native';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { useSubscription } from '../context/SubscriptionContext';
import {
  recordPaywallConverted,
  recordPaywallDismissed,
  recordPaywallViewed,
} from '../lib/activationTracker';
import { trackConversion } from '../lib/conversionTracking';
import { getABTestVariant } from '../lib/monetization';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Legal URLs
const LEGAL_DOCS_BASE_URL = (
  process.env.EXPO_PUBLIC_LEGAL_DOCS_BASE_URL
  || 'https://thomashowells0894.github.io/fitness-app'
).replace(/\/$/, '');
const TERMS_URL = `${LEGAL_DOCS_BASE_URL}/terms.html`;
const PRIVACY_URL = `${LEGAL_DOCS_BASE_URL}/privacy-policy.html`;

// Premium accent color - Electric Blue
const ACCENT = Colors.primary;
const ACCENT_GLOW = Colors.primaryGlow;
const ACCENT_DIM = Colors.primaryDim;

// Feature item with staggered animation
function FeatureItem({ icon: Icon, title, delay = 0 }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Animated.View
      style={[
        styles.featureItem,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.featureIconContainer}>
        <CheckCircle size={22} color={ACCENT} strokeWidth={2.5} />
      </View>
      <Text style={styles.featureText}>{title}</Text>
    </Animated.View>
  );
}

function getPaywallContent(source, trigger, messageVariant = 'speed') {
  if (trigger === 'after_value') {
    if (messageVariant === 'clarity') {
      return {
        headlineTop: 'Understand Today,',
        headlineAccent: 'Without Guessing',
        subheadline: 'You already felt the logging loop. Pro makes the next decision obvious with clearer daily guidance.',
        features: [
          'See the single best next nutrition action',
          'Faster shortcuts for repeat meals',
          'Coach and deeper daily insight',
          'Ad-free focus',
        ],
      };
    }

    if (messageVariant === 'coach') {
      return {
        headlineTop: 'Keep The Speed,',
        headlineAccent: 'Add A Coach',
        subheadline: 'You already have the habit loop. Pro adds smarter feedback and coaching on top of it.',
        features: [
          'Coach nudges based on your day',
          'Premium scan and shortcut workflows',
          'Voice logging for faster capture',
          'Ad-free focus',
        ],
      };
    }

    return {
      headlineTop: 'Keep The Speed,',
      headlineAccent: 'Add Pro',
      subheadline: 'You already felt the core loop. Pro adds faster capture and clearer daily guidance.',
      features: [
        'Voice logging when your hands are busy',
        'Premium scan and shortcut workflows',
        'Coach and deeper progress insight',
        'Ad-free focus',
      ],
    };
  }

  if (source === 'voice_logging') {
    return {
      headlineTop: 'Unlock Hands-Free',
      headlineAccent: 'Food Logging',
      subheadline: 'Speak meals out loud, keep momentum, and let Pro handle the capture work.',
      features: [
        'Voice logging for fast capture',
        'Barcode and AI scan workflows',
        'Smarter shortcuts for repeat meals',
        'Ad-free focus',
      ],
    };
  }

  if (messageVariant === 'clarity') {
    return {
      headlineTop: 'See Today',
      headlineAccent: 'More Clearly',
      subheadline: 'Pro removes noise after logging and shows what matters next so users stay on track faster.',
      features: [
        'Clearer daily targets and next actions',
        'Premium scan and faster shortcuts',
        'Coach and deeper progress insight',
        'Ad-free focus',
      ],
    };
  }

  if (messageVariant === 'coach') {
    return {
      headlineTop: 'Unlock Your',
      headlineAccent: 'Nutrition Coach',
      subheadline: 'Pro combines faster capture with coaching that reacts to your actual day, not generic plans.',
      features: [
        'Coach nudges based on your day',
        'Voice logging and AI capture tools',
        'Premium scan and shortcut workflows',
        'Ad-free focus',
      ],
    };
  }

  return {
    headlineTop: 'Log Faster.',
    headlineAccent: 'See More.',
    subheadline: 'Pro is built to save time on capture and give you clearer insight once food is logged.',
    features: [
      'Voice logging and AI capture tools',
      'Premium scan and faster shortcuts',
      'Coach and deeper daily insights',
      'Ad-free focus',
    ],
  };
}

// Pricing card component
function PricingCard({
  title,
  price,
  period,
  subtitle,
  isPopular,
  isSelected,
  onSelect,
  badge,
  testID,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSelected) {
      Animated.spring(glowAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [isSelected]);

  const handlePress = async () => {
    await hapticLight();

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    onSelect();
  };

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.08)', ACCENT],
  });

  return (
    <Animated.View style={[styles.pricingCardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable onPress={handlePress} testID={testID}>
        <Animated.View
          style={[
            styles.pricingCard,
            isPopular && styles.pricingCardPopular,
            { borderColor },
          ]}
        >
          {/* Popular badge */}
          {badge && (
            <View style={styles.popularBadge}>
              <LinearGradient
                colors={[ACCENT, ACCENT_DIM]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.popularBadgeGradient}
              >
                <Text style={styles.popularBadgeText}>{badge}</Text>
              </LinearGradient>
            </View>
          )}

          {/* Card content */}
          <View style={styles.pricingCardContent}>
            <Text style={styles.pricingTitle}>{title}</Text>

            <View style={styles.priceContainer}>
              <Text style={styles.priceCurrency}>$</Text>
              <Text style={styles.priceAmount}>{price}</Text>
              <Text style={styles.pricePeriod}>/{period}</Text>
            </View>

            {subtitle && (
              <Text style={styles.priceSubtitle}>{subtitle}</Text>
            )}
          </View>

          {/* Selection indicator */}
          <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
            {isSelected && (
              <View style={styles.radioInner}>
                <LinearGradient
                  colors={[ACCENT, ACCENT_DIM]}
                  style={styles.radioInnerGradient}
                />
              </View>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    monthlyPackage,
    annualPackage,
    annualSavings,
    purchasePackage,
    restorePurchases,
    purchaseInProgress,
    isPremium,
  } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [messageVariant, setMessageVariant] = useState('speed');
  const [planVariant, setPlanVariant] = useState('yearly');
  const [experimentsReady, setExperimentsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const paywallSource = Array.isArray(params.source) ? params.source[0] : params.source || 'direct';
  const paywallTrigger = Array.isArray(params.trigger) ? params.trigger[0] : params.trigger || 'direct';
  const paywallContent = useMemo(
    () => getPaywallContent(paywallSource, paywallTrigger, messageVariant),
    [messageVariant, paywallSource, paywallTrigger]
  );
  const paywallExperimentVariant = `${messageVariant}:${planVariant}`;

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getABTestVariant('paywall_message'),
      getABTestVariant('paywall_default_plan'),
    ]).then(([nextMessageVariant, nextPlanVariant]) => {
      if (cancelled) return;

      if (nextMessageVariant) {
        setMessageVariant(nextMessageVariant);
      }

      if (nextPlanVariant === 'monthly' || nextPlanVariant === 'yearly') {
        setPlanVariant(nextPlanVariant);
        setSelectedPlan(nextPlanVariant);
      }

      setExperimentsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.9)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(50)).current;
  const glowPulse = useRef(new Animated.Value(0.5)).current;

  // If already premium, go back
  useEffect(() => {
    if (isPremium) {
      router.back();
    }
  }, [isPremium]);

  // Entrance animations
  useEffect(() => {
    // Header animation
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(headerScale, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    // Content fade in
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 500,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // Button slide up
    Animated.spring(buttonSlide, {
      toValue: 0,
      friction: 8,
      tension: 60,
      delay: 500,
      useNativeDriver: true,
    }).start();

    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.5,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!experimentsReady) {
      return;
    }

    recordPaywallViewed({
      source: paywallSource,
      trigger: paywallTrigger,
    }).catch(() => {});
    trackConversion({
      event: 'paywall_shown',
      source: paywallSource,
      variant: paywallExperimentVariant,
      metadata: {
        trigger: paywallTrigger,
        messageVariant,
        defaultPlan: planVariant,
      },
    });
  }, [
    experimentsReady,
    messageVariant,
    paywallExperimentVariant,
    paywallSource,
    paywallTrigger,
    planVariant,
  ]);

  const handleClose = async () => {
    await hapticLight();
    recordPaywallDismissed({
      source: paywallSource,
      trigger: paywallTrigger,
    });
    trackConversion({
      event: 'paywall_dismissed',
      source: paywallSource,
      variant: paywallExperimentVariant,
      metadata: {
        trigger: paywallTrigger,
        messageVariant,
        defaultPlan: planVariant,
      },
    });
    router.back();
  };

  const handleSubscribe = async () => {
    if (isProcessing || purchaseInProgress) return;

    setIsProcessing(true);

    try {
      await hapticImpact();
      trackConversion({
        event: 'purchase_started',
        source: paywallSource,
        variant: paywallExperimentVariant,
        metadata: {
          trigger: paywallTrigger,
          selectedPlan,
        },
      });

      const packageToPurchase = selectedPlan === 'yearly' ? annualPackage : monthlyPackage;

      if (!packageToPurchase) {
        trackConversion({
          event: 'purchase_failed',
          source: paywallSource,
          variant: paywallExperimentVariant,
          metadata: {
            trigger: paywallTrigger,
            selectedPlan,
            reason: 'missing_package',
          },
        });
        Alert.alert(
          'Purchases Unavailable',
          'Subscription plans could not be loaded. Please try again in a moment.',
        );
        return;
      }

      const result = await purchasePackage(packageToPurchase);

      if (result.success) {
        await hapticSuccess();
        recordPaywallConverted({
          source: paywallSource,
          trigger: paywallTrigger,
          plan: selectedPlan,
        });
        trackConversion({
          event: 'purchase_completed',
          source: paywallSource,
          variant: paywallExperimentVariant,
          metadata: {
            trigger: paywallTrigger,
            selectedPlan,
          },
        });
        router.back();
      } else if (!result.cancelled) {
        trackConversion({
          event: 'purchase_failed',
          source: paywallSource,
          variant: paywallExperimentVariant,
          metadata: {
            trigger: paywallTrigger,
            selectedPlan,
            reason: result.error || 'purchase_failed',
          },
        });
        Alert.alert(
          'Purchase Failed',
          result.error || 'Unable to start your subscription. Please try again.',
        );
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[Paywall] Purchase error:', error?.message);
      }
      trackConversion({
        event: 'purchase_failed',
        source: paywallSource,
        variant: paywallExperimentVariant,
        metadata: {
          trigger: paywallTrigger,
          selectedPlan,
          reason: error?.message || 'unexpected_error',
        },
      });
      Alert.alert(
        'Purchase Failed',
        error?.message || 'Unable to start your subscription. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (isProcessing || purchaseInProgress) return;

    setIsProcessing(true);

    try {
      await hapticLight();
      await restorePurchases();
    } finally {
      setIsProcessing(false);
    }
  };

  const openTerms = () => Linking.openURL(TERMS_URL);
  const openPrivacy = () => Linking.openURL(PRIVACY_URL);

  // Get prices from packages or use defaults
  const monthlyPrice = monthlyPackage?.product?.priceString || '$9.99';
  const yearlyPrice = annualPackage?.product?.priceString || '$99.99';
  const yearlyPerMonth = annualPackage
    ? `$${(annualPackage.product.price / 12).toFixed(2)}/mo`
    : '$8.33/mo';
  const savingsPercent = annualSavings > 0 ? annualSavings : 17;

  // Animated glow opacity
  const glowOpacity = glowPulse.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <View style={styles.container} testID="paywall-screen">
      {/* Deep gradient background */}
      <LinearGradient
        colors={['#000000', '#050508', '#0A0A10', '#08080C']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.backgroundGradient}
      />

      {/* Ambient glow effect */}
      <Animated.View style={[styles.ambientGlow, { opacity: glowOpacity }]}>
        <LinearGradient
          colors={['transparent', ACCENT_GLOW, 'transparent']}
          style={styles.ambientGlowGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Close Button */}
        <Pressable
          style={styles.closeButton}
          onPress={handleClose}
          testID="paywall-close-button"
        >
          <BlurView intensity={30} tint="dark" style={styles.closeButtonBlur}>
            <X size={20} color={Colors.textSecondary} strokeWidth={2} />
          </BlurView>
        </Pressable>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header Section */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerOpacity,
                transform: [{ scale: headerScale }],
              },
            ]}
          >
            {/* Premium icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[ACCENT, ACCENT_DIM]}
                style={styles.iconGradient}
              >
                <Sparkles size={32} color="#000" strokeWidth={2.5} />
              </LinearGradient>
              <View style={styles.iconGlowRing} />
            </View>

            {/* Headlines */}
            <Text style={styles.headline}>
              {paywallContent.headlineTop}{'\n'}
              <Text style={styles.headlineAccent}>{paywallContent.headlineAccent}</Text>
            </Text>

            <Text style={styles.subheadline}>
              {paywallContent.subheadline}
            </Text>
          </Animated.View>

          {/* Features List */}
          <Animated.View style={[styles.featuresContainer, { opacity: contentOpacity }]}>
            <FeatureItem
              icon={Dumbbell}
              title={paywallContent.features[0]}
              delay={400}
            />
            <FeatureItem
              icon={ChefHat}
              title={paywallContent.features[1]}
              delay={500}
            />
            <FeatureItem
              icon={Zap}
              title={paywallContent.features[2]}
              delay={600}
            />
            <FeatureItem
              icon={CircleOff}
              title={paywallContent.features[3]}
              delay={700}
            />
          </Animated.View>

          {/* Pricing Cards */}
          <Animated.View style={[styles.pricingSection, { opacity: contentOpacity }]}>
            <View style={styles.pricingCardsRow}>
              {/* Monthly */}
              <PricingCard
                testID="paywall-monthly-plan"
                title="Monthly"
                price={monthlyPrice.replace(/[^0-9.]/g, '')}
                period="month"
                isSelected={selectedPlan === 'monthly'}
                onSelect={() => setSelectedPlan('monthly')}
              />

              {/* Yearly - Featured */}
              <PricingCard
                testID="paywall-yearly-plan"
                title="Yearly"
                price={yearlyPrice.replace(/[^0-9.]/g, '')}
                period="year"
                subtitle={yearlyPerMonth}
                isPopular={true}
                isSelected={selectedPlan === 'yearly'}
                onSelect={() => setSelectedPlan('yearly')}
                badge={`SAVE ${savingsPercent}%`}
              />
            </View>
          </Animated.View>

          {/* CTA Button */}
          <Animated.View
            style={[
              styles.ctaContainer,
              { transform: [{ translateY: buttonSlide }] },
            ]}
          >
            <Pressable
              testID="paywall-subscribe-button"
              style={[styles.ctaButton, isProcessing && styles.ctaButtonDisabled]}
              onPress={handleSubscribe}
              disabled={isProcessing || purchaseInProgress}
            >
              <LinearGradient
                colors={[ACCENT, ACCENT_DIM]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButtonGradient}
              >
                {isProcessing || purchaseInProgress ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Zap size={22} color="#000" strokeWidth={2.5} />
                    <Text style={styles.ctaButtonText}>
                      Start 7-Day Free Trial
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {/* Trial info */}
            <Text style={styles.trialInfo}>
              7-day free trial, then{' '}
              {selectedPlan === 'yearly' ? yearlyPrice + '/year' : monthlyPrice + '/month'}
            </Text>
          </Animated.View>

          {/* Footer Links */}
          <View style={styles.footer}>
            {/* Restore */}
            <Pressable
              onPress={handleRestore}
              style={styles.restoreButton}
              testID="paywall-restore-button"
            >
              <Text style={styles.restoreText}>Restore Purchases</Text>
            </Pressable>

            {/* Legal Links */}
            <View style={styles.legalLinks}>
              <Pressable onPress={openTerms}>
                <Text style={styles.legalLink}>Terms</Text>
              </Pressable>
              <View style={styles.legalDot} />
              <Pressable onPress={openPrivacy}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </Pressable>
            </View>

            {/* Legal text - Required by Apple */}
            <Text style={styles.legalText}>
              Payment will be charged to your{' '}
              {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account.
              Subscription auto-renews unless cancelled 24 hours before the
              period ends. Manage subscriptions in your account settings.
            </Text>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  ambientGlow: {
    position: 'absolute',
    top: -100,
    left: 0,
    right: 0,
    height: 400,
  },
  ambientGlowGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 16,
    right: 16,
    zIndex: 100,
  },
  closeButtonBlur: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: SCREEN_HEIGHT * 0.08,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconGlowRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    top: -8,
    left: -8,
    borderWidth: 1,
    borderColor: ACCENT_GLOW,
  },
  headline: {
    fontSize: 38,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -1,
  },
  headlineAccent: {
    color: ACCENT,
  },
  subheadline: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    letterSpacing: 0.3,
  },

  // Features
  featuresContainer: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureIconContainer: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  featureText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    letterSpacing: 0.2,
  },

  // Pricing
  pricingSection: {
    marginBottom: Spacing.lg,
  },
  pricingCardsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  pricingCardWrapper: {
    flex: 1,
  },
  pricingCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
    minHeight: 140,
    justifyContent: 'space-between',
  },
  pricingCardPopular: {
    backgroundColor: 'rgba(0,212,255,0.05)',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  popularBadgeGradient: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: '#000',
    letterSpacing: 1,
  },
  pricingCardContent: {
    flex: 1,
  },
  pricingTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginRight: 2,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginLeft: 2,
  },
  priceSubtitle: {
    fontSize: FontSize.sm,
    color: ACCENT,
    marginTop: 4,
    fontWeight: FontWeight.medium,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  radioOuterSelected: {
    borderColor: ACCENT,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  radioInnerGradient: {
    flex: 1,
  },

  // CTA Button
  ctaContainer: {
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.glowPrimary,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 18,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: FontWeight.bold,
    color: '#000',
    letterSpacing: 0.3,
  },
  trialInfo: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  restoreButton: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  restoreText: {
    fontSize: FontSize.md,
    color: ACCENT,
    fontWeight: FontWeight.medium,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  legalLink: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  legalDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textTertiary,
    marginHorizontal: Spacing.sm,
  },
  legalText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: Spacing.md,
  },
  bottomSpacer: {
    height: 40,
  },
});
