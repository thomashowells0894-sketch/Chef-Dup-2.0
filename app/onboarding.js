import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Animated,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Camera,
  Mic,
  Zap,
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
import { calculateUserBaselines } from '../services/ai';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 4;

// Example chips for AI Genesis input
const EXAMPLE_CHIPS = [
  '25M, 80kg, gym 4x/week, lose fat',
  '30F, 65kg, yoga, maintain weight',
  '22M, skinny, want to bulk up',
];

// Feature pills for welcome slide
const FEATURE_PILLS = [
  { label: 'Scan Food with AI', emoji: '\uD83D\uDCF8' },
  { label: 'AI Nutritionist Chat', emoji: '\uD83E\uDD16' },
  { label: 'Smart Workout Generator', emoji: '\uD83C\uDFCB\uFE0F' },
];

// Feature cards for showcase slide
const FEATURE_CARDS = [
  {
    Icon: Camera,
    title: 'Point & Track',
    description: 'Snap a photo of any meal and get instant macros',
    color: Colors.primary,
  },
  {
    Icon: Mic,
    title: 'Voice Logging',
    description: 'Just say what you ate \u2014 hands free',
    color: Colors.secondary,
  },
  {
    Icon: Sparkles,
    title: 'AI Coach',
    description: 'Get personalized nutrition advice 24/7',
    color: Colors.success,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { fetchProfile } = useProfile();
  const { user } = useAuth();

  // Step management
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Step 3 state
  const [userDescription, setUserDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Step 4 state (AI results)
  const [aiResults, setAiResults] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Animation refs for step transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animate transition between steps
  const animateTransition = useCallback(
    (newStep, dir) => {
      const exitDirection = dir === 1 ? -1 : 1;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: exitDirection * 60,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStep(newStep);
        setDirection(dir);
        slideAnim.setValue(dir * 60);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 12,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [fadeAnim, slideAnim]
  );

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS) {
      animateTransition(step + 1, 1);
    }
  }, [step, animateTransition]);

  const goBack = useCallback(() => {
    if (step > 1) {
      animateTransition(step - 1, -1);
    }
  }, [step, animateTransition]);

  // Step 3: Generate AI plan
  const handleGeneratePlan = useCallback(async () => {
    if (!userDescription.trim() || userDescription.trim().length < 10) {
      Alert.alert(
        'More Details Needed',
        'Please describe yourself in a bit more detail so our AI can create your personalized plan.'
      );
      return;
    }

    setIsAnalyzing(true);
    try {
      const results = await calculateUserBaselines(userDescription.trim());
      setAiResults(results);
      animateTransition(4, 1);
    } catch (error) {
      Alert.alert(
        'Something went wrong',
        error.message || 'Failed to analyze your profile. Please try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [userDescription, animateTransition]);

  // Step 4: Save profile and navigate
  const handleStartJourney = useCallback(async () => {
    if (!aiResults || !user) return;

    setIsSaving(true);
    try {
      // Convert AI results to profile format for Supabase
      // The AI returns weight in whatever unit it parsed; we store as-is
      const weightInLbs =
        aiResults.weight_unit === 'kg'
          ? Math.round(aiResults.weight * 2.20462)
          : aiResults.weight;

      // Convert height to inches if needed
      let heightInInches = aiResults.height;
      if (aiResults.height_unit === 'cm') {
        heightInInches = Math.round(aiResults.height / 2.54);
      } else if (aiResults.height_unit === 'ft') {
        // If height was given in feet (e.g., 5.83 for 5'10"), convert
        heightInInches = Math.round(aiResults.height * 12);
      }

      // Map AI activity_level to profile keys
      const activityMap = {
        sedentary: 'sedentary',
        light: 'light',
        lightly_active: 'light',
        moderate: 'moderate',
        moderately_active: 'moderate',
        active: 'active',
        very_active: 'active',
        extreme: 'extreme',
        extremely_active: 'extreme',
      };

      // Map AI goal to weekly_goal
      const goalMap = {
        lose: 'lose1',
        lose_fat: 'lose1',
        cut: 'lose1',
        maintain: 'maintain',
        recomp: 'maintain',
        gain: 'gain05',
        bulk: 'gain05',
        build_muscle: 'gain05',
      };

      const profileData = {
        user_id: user.id,
        age: aiResults.age,
        weight: weightInLbs,
        height: heightInInches,
        gender: aiResults.gender || 'male',
        activity_level:
          activityMap[aiResults.activity_level] || 'moderate',
        weekly_goal: goalMap[aiResults.goal] || 'maintain',
        weight_unit: aiResults.weight_unit === 'kg' ? 'kg' : 'lbs',
        macro_preset: 'custom',
        custom_macros: {
          protein: Math.round(
            ((aiResults.protein * 4) / aiResults.calories) * 100
          ),
          carbs: Math.round(
            ((aiResults.carbs * 4) / aiResults.calories) * 100
          ),
          fat: Math.round(
            ((aiResults.fat * 9) / aiResults.calories) * 100
          ),
        },
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) {
        throw new Error(error.message);
      }

      // Refresh profile context
      await fetchProfile();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(
        'Save Failed',
        error.message || 'Failed to save your profile. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [aiResults, user, fetchProfile, router]);

  // ---------- RENDER HELPERS ----------

  const renderProgressDots = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3, 4].map((dotStep) => (
        <View
          key={dotStep}
          style={[
            styles.progressDot,
            dotStep === step && styles.progressDotActive,
            dotStep < step && styles.progressDotCompleted,
          ]}
        />
      ))}
    </View>
  );

  const renderBackButton = () => {
    if (step <= 1) return <View style={styles.backButtonPlaceholder} />;
    return (
      <Pressable style={styles.backButton} onPress={goBack}>
        <ArrowLeft size={22} color={Colors.textSecondary} />
      </Pressable>
    );
  };

  // ---------- STEP 1: Welcome ----------
  const renderWelcome = () => (
    <View style={styles.stepContent}>
      {/* Logo / Sparkles icon with glow */}
      <ReAnimated.View
        entering={FadeInDown.springify().damping(12).delay(100)}
        style={styles.logoContainer}
      >
        <View style={styles.logoGlow}>
          <LinearGradient
            colors={Gradients.primary}
            style={styles.logoGradient}
          >
            <Sparkles size={52} color="#fff" />
          </LinearGradient>
        </View>
      </ReAnimated.View>

      {/* Headline */}
      <ReAnimated.View
        entering={FadeInDown.springify().damping(12).delay(200)}
      >
        <Text style={styles.welcomeTitle}>
          Your AI-Powered Fitness Journey Starts Here
        </Text>
      </ReAnimated.View>

      {/* Feature pills */}
      <View style={styles.pillsContainer}>
        {FEATURE_PILLS.map((pill, index) => (
          <ReAnimated.View
            key={pill.label}
            entering={FadeInDown.springify()
              .damping(12)
              .delay(400 + index * 150)}
          >
            <View style={styles.featurePill}>
              <Text style={styles.featurePillEmoji}>{pill.emoji}</Text>
              <Text style={styles.featurePillText}>{pill.label}</Text>
            </View>
          </ReAnimated.View>
        ))}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Next button */}
      <ReAnimated.View
        entering={FadeInUp.springify().damping(12).delay(850)}
        style={styles.buttonWrapper}
      >
        <Pressable style={styles.primaryButton} onPress={goNext}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButtonGradient}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
            <ArrowRight size={20} color="#fff" />
          </LinearGradient>
        </Pressable>
      </ReAnimated.View>
    </View>
  );

  // ---------- STEP 2: Feature Showcase ----------
  const renderFeatureShowcase = () => (
    <View style={styles.stepContent}>
      <ReAnimated.View
        entering={FadeInDown.springify().damping(12).delay(100)}
      >
        <Text style={styles.stepTitle}>What VibeFit Can Do</Text>
        <Text style={styles.stepSubtitle}>
          Powered by AI to make tracking effortless
        </Text>
      </ReAnimated.View>

      <View style={styles.featureCardsContainer}>
        {FEATURE_CARDS.map((card, index) => (
          <ReAnimated.View
            key={card.title}
            entering={FadeInDown.springify()
              .damping(12)
              .delay(250 + index * 150)}
          >
            <View style={styles.glassCard}>
              <View
                style={[
                  styles.cardIconContainer,
                  { backgroundColor: `${card.color}20` },
                ]}
              >
                <card.Icon size={26} color={card.color} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDescription}>
                  {card.description}
                </Text>
              </View>
            </View>
          </ReAnimated.View>
        ))}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Next button */}
      <ReAnimated.View
        entering={FadeInUp.springify().damping(12).delay(700)}
        style={styles.buttonWrapper}
      >
        <Pressable style={styles.primaryButton} onPress={goNext}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButtonGradient}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
            <ArrowRight size={20} color="#fff" />
          </LinearGradient>
        </Pressable>
      </ReAnimated.View>
    </View>
  );

  // ---------- STEP 3: AI Genesis ----------
  const renderAIGenesis = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.genesisScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ReAnimated.View
          entering={FadeInDown.springify().damping(12).delay(100)}
          style={styles.genesisHeader}
        >
          <View style={styles.genesisHeaderRow}>
            <Sparkles size={24} color={Colors.primary} />
            <Text style={styles.stepTitle}>Tell us about yourself</Text>
          </View>
          <Text style={styles.stepSubtitle}>
            Describe yourself naturally {'\u2014'} our AI will create your
            personalized plan
          </Text>
        </ReAnimated.View>

        {/* Text Input */}
        <ReAnimated.View
          entering={FadeInDown.springify().damping(12).delay(250)}
        >
          <View style={styles.glassInputContainer}>
            <TextInput
              style={styles.glassInput}
              multiline
              numberOfLines={4}
              placeholder="e.g. I'm a 25-year-old guy, 180lbs, 5'10. I lift 4x a week and want to lose some belly fat while keeping muscle..."
              placeholderTextColor={Colors.textTertiary}
              value={userDescription}
              onChangeText={setUserDescription}
              textAlignVertical="top"
              editable={!isAnalyzing}
            />
          </View>
        </ReAnimated.View>

        {/* Example chips */}
        <ReAnimated.View
          entering={FadeInDown.springify().damping(12).delay(400)}
          style={styles.chipsContainer}
        >
          <Text style={styles.chipsLabel}>Try an example:</Text>
          <View style={styles.chipsRow}>
            {EXAMPLE_CHIPS.map((chip) => (
              <Pressable
                key={chip}
                style={styles.exampleChip}
                onPress={() => {
                  if (!isAnalyzing) setUserDescription(chip);
                }}
              >
                <Text style={styles.exampleChipText}>{chip}</Text>
              </Pressable>
            ))}
          </View>
        </ReAnimated.View>

        {/* Generate button */}
        <ReAnimated.View
          entering={FadeInUp.springify().damping(12).delay(550)}
          style={styles.buttonWrapper}
        >
          <Pressable
            style={[
              styles.primaryButton,
              isAnalyzing && styles.buttonDisabled,
            ]}
            onPress={handleGeneratePlan}
            disabled={isAnalyzing}
          >
            <LinearGradient
              colors={
                isAnalyzing ? Gradients.disabled : Gradients.primary
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              {isAnalyzing ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    AI is analyzing...
                  </Text>
                </>
              ) : (
                <>
                  <Sparkles size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    Generate My Plan
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </ReAnimated.View>

        {/* Manual entry link */}
        <ReAnimated.View
          entering={FadeInUp.springify().damping(12).delay(650)}
          style={styles.linkContainer}
        >
          <Pressable onPress={() => router.push('/manual-profile')}>
            <Text style={styles.linkText}>
              I'd rather enter manually
            </Text>
          </Pressable>
        </ReAnimated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ---------- STEP 4: Your Plan ----------
  const renderYourPlan = () => {
    if (!aiResults) return null;

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.planScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ReAnimated.View
          entering={FadeInDown.springify().damping(12).delay(100)}
        >
          <Text style={styles.planHeaderTitle}>Your Personalized Plan</Text>
          <Text style={styles.stepSubtitle}>
            Here's what our AI recommends for you
          </Text>
        </ReAnimated.View>

        {/* Large calorie number */}
        <ReAnimated.View
          entering={FadeInDown.springify().damping(12).delay(250)}
          style={styles.calorieCard}
        >
          <LinearGradient
            colors={Gradients.card}
            style={styles.calorieCardGradient}
          >
            <Text style={styles.calorieNumber}>{aiResults.calories}</Text>
            <Text style={styles.calorieLabel}>Daily Calories</Text>
          </LinearGradient>
        </ReAnimated.View>

        {/* Macro cards row */}
        <View style={styles.macroRow}>
          {/* Protein */}
          <ReAnimated.View
            entering={FadeInDown.springify().damping(12).delay(400)}
            style={styles.macroCardWrapper}
          >
            <View
              style={[
                styles.macroCard,
                { borderColor: `${Colors.protein}30` },
              ]}
            >
              <Text style={[styles.macroValue, { color: Colors.protein }]}>
                {aiResults.protein}g
              </Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
          </ReAnimated.View>

          {/* Carbs */}
          <ReAnimated.View
            entering={FadeInDown.springify().damping(12).delay(500)}
            style={styles.macroCardWrapper}
          >
            <View
              style={[
                styles.macroCard,
                { borderColor: `${Colors.carbs}30` },
              ]}
            >
              <Text style={[styles.macroValue, { color: Colors.carbs }]}>
                {aiResults.carbs}g
              </Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
          </ReAnimated.View>

          {/* Fat */}
          <ReAnimated.View
            entering={FadeInDown.springify().damping(12).delay(600)}
            style={styles.macroCardWrapper}
          >
            <View
              style={[
                styles.macroCard,
                { borderColor: `${Colors.fat}30` },
              ]}
            >
              <Text style={[styles.macroValue, { color: Colors.fat }]}>
                {aiResults.fat}g
              </Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </ReAnimated.View>
        </View>

        {/* BMR & TDEE */}
        <ReAnimated.View
          entering={FadeInDown.springify().damping(12).delay(700)}
          style={styles.statsRow}
        >
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{aiResults.bmr}</Text>
            <Text style={styles.statLabel}>BMR</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{aiResults.tdee}</Text>
            <Text style={styles.statLabel}>TDEE</Text>
          </View>
        </ReAnimated.View>

        {/* Goal summary */}
        <ReAnimated.View
          entering={FadeInDown.springify().damping(12).delay(800)}
          style={styles.goalSummaryContainer}
        >
          <View style={styles.goalSummaryCard}>
            <Sparkles
              size={18}
              color={Colors.primary}
              style={{ marginBottom: Spacing.sm }}
            />
            <Text style={styles.goalSummaryText}>
              {aiResults.goal_summary}
            </Text>
          </View>
        </ReAnimated.View>

        {/* Start Journey button */}
        <ReAnimated.View
          entering={FadeInUp.springify().damping(12).delay(950)}
          style={styles.buttonWrapper}
        >
          <Pressable
            style={[
              styles.primaryButton,
              isSaving && styles.buttonDisabled,
            ]}
            onPress={handleStartJourney}
            disabled={isSaving}
          >
            <LinearGradient
              colors={isSaving ? Gradients.disabled : Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              {isSaving ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.primaryButtonText}>Saving...</Text>
                </>
              ) : (
                <>
                  <Zap size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    Start Your Journey
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </ReAnimated.View>

        {/* Adjust manually link */}
        <ReAnimated.View
          entering={FadeInUp.springify().damping(12).delay(1050)}
          style={styles.linkContainer}
        >
          <Pressable onPress={() => router.push('/manual-profile')}>
            <Text style={styles.linkText}>Adjust Manually</Text>
          </Pressable>
        </ReAnimated.View>
      </ScrollView>
    );
  };

  // ---------- STEP RENDERER ----------
  const renderStep = () => {
    switch (step) {
      case 1:
        return renderWelcome();
      case 2:
        return renderFeatureShowcase();
      case 3:
        return renderAIGenesis();
      case 4:
        return renderYourPlan();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={Gradients.background} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Top bar: back button + progress dots */}
          <View style={styles.topBar}>
            {renderBackButton()}
            {renderProgressDots()}
            {/* Spacer to balance the back button */}
            <View style={styles.backButtonPlaceholder} />
          </View>

          {/* Animated step content */}
          <Animated.View
            style={[
              styles.animatedContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {renderStep()}
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// ---------- STYLES ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },

  // Progress dots
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceBright,
  },
  progressDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  progressDotCompleted: {
    backgroundColor: Colors.primaryDim,
  },

  // Animated container
  animatedContainer: {
    flex: 1,
  },

  // Step content
  stepContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },

  // ----- STEP 1: Welcome -----
  logoContainer: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  logoGlow: {
    ...Shadows.glowPrimary,
    borderRadius: 36,
  },
  logoGradient: {
    width: 110,
    height: 110,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: FontSize.xxl * 1.25,
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.sm,
  },
  pillsContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  featurePillEmoji: {
    fontSize: 18,
  },
  featurePillText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },

  // ----- STEP 2: Feature Showcase -----
  stepTitle: {
    fontSize: FontSize.xl + 2,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: FontSize.md * 1.5,
    marginBottom: Spacing.lg,
  },
  featureCardsContainer: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  glassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardIconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.45,
  },

  // ----- STEP 3: AI Genesis -----
  genesisScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  genesisHeader: {
    marginBottom: Spacing.md,
  },
  genesisHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  glassInputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  glassInput: {
    fontSize: FontSize.md,
    color: Colors.text,
    padding: Spacing.md,
    minHeight: 120,
    lineHeight: FontSize.md * 1.5,
  },
  chipsContainer: {
    marginBottom: Spacing.xl,
  },
  chipsLabel: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  exampleChip: {
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
  },
  exampleChipText: {
    fontSize: FontSize.xs + 1,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },

  // ----- STEP 4: Your Plan -----
  planScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  planHeaderTitle: {
    fontSize: FontSize.xl + 4,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  calorieCard: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  calorieCardGradient: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  calorieNumber: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.black,
    color: Colors.primary,
    letterSpacing: -1,
  },
  calorieLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  // Macro cards
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  macroCardWrapper: {
    flex: 1,
  },
  macroCard: {
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 4,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  macroLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // BMR / TDEE stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Goal summary
  goalSummaryContainer: {
    marginBottom: Spacing.xl,
  },
  goalSummaryCard: {
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  goalSummaryText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSize.md * 1.55,
  },

  // ----- Shared button styles -----
  buttonWrapper: {
    marginTop: Spacing.sm,
  },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.button,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 4,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.7,
    ...Shadows.inner,
  },

  // Link
  linkContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  linkText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
