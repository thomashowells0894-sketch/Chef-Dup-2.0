import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Target, Brain, Users, Bell, Dumbbell, Moon, ChefHat, Scale, Utensils } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants/theme';
import { useProfile } from '../../context/ProfileContext';
import { hapticLight } from '../../lib/haptics';

const CHALLENGES = [
  { id: 'consistency', label: 'Staying consistent', icon: Target, description: 'I start strong but lose motivation' },
  { id: 'protein', label: 'Getting enough protein', icon: Dumbbell, description: 'I always fall short on protein' },
  { id: 'portions', label: 'Controlling portions', icon: Scale, description: 'I tend to overeat at meals' },
  { id: 'snacking', label: 'Late-night snacking', icon: Moon, description: 'I snack too much in the evening' },
  { id: 'planning', label: 'Meal planning', icon: ChefHat, description: 'I never know what to eat' },
];

const MOTIVATION_STYLES = [
  { id: 'gamification', label: 'Streaks & challenges', icon: Target, description: 'Keep me engaged with rewards and streaks' },
  { id: 'analytics', label: 'Data & insights', icon: Brain, description: 'Show me the numbers and trends' },
  { id: 'social', label: 'Social accountability', icon: Users, description: 'Let my friends keep me on track' },
  { id: 'reminders', label: 'Gentle reminders', icon: Bell, description: 'Just nudge me when I forget' },
];

export default function BehaviorScreen() {
  const router = useRouter();
  const { updateProfile } = useProfile();
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [selectedMotivation, setSelectedMotivation] = useState(null);
  const [step, setStep] = useState(0); // 0 = challenges, 1 = motivation

  const handleChallengeSelect = useCallback((id) => {
    hapticLight();
    setSelectedChallenge(id);
  }, []);

  const handleMotivationSelect = useCallback((id) => {
    hapticLight();
    setSelectedMotivation(id);
  }, []);

  const handleNext = useCallback(async () => {
    hapticLight();
    if (step === 0 && selectedChallenge) {
      setStep(1);
    } else if (step === 1 && selectedMotivation) {
      // Save preferences
      await updateProfile({
        behaviorProfile: {
          primaryChallenge: selectedChallenge,
          motivationStyle: selectedMotivation,
        },
      });
      router.push('/onboarding/goals');
    }
  }, [step, selectedChallenge, selectedMotivation, updateProfile, router]);

  const currentItems = step === 0 ? CHALLENGES : MOTIVATION_STYLES;
  const currentSelected = step === 0 ? selectedChallenge : selectedMotivation;
  const handleSelect = step === 0 ? handleChallengeSelect : handleMotivationSelect;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.step}>Step {step === 0 ? '2' : '3'} of 6</Text>
          <Text style={styles.title}>
            {step === 0 ? "What's your biggest challenge?" : 'How do you like to be motivated?'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 0
              ? "We'll personalize your experience based on this"
              : "This helps us show you the right features"}
          </Text>
        </Animated.View>

        <View style={styles.options}>
          {currentItems.map((item, index) => {
            const Icon = item.icon;
            const isSelected = currentSelected === item.id;
            return (
              <Animated.View key={item.id} entering={FadeInDown.duration(400).delay(100 + index * 80)}>
                <Pressable
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => handleSelect(item.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                    <Icon size={20} color={isSelected ? Colors.primary : Colors.textSecondary} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {item.label}
                    </Text>
                    <Text style={styles.optionDesc}>{item.description}</Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.nextButton, !currentSelected && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!currentSelected}
        >
          <Text style={styles.nextButtonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 120 },
  step: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: FontSize.md * 1.5, marginBottom: Spacing.xl },
  options: { gap: Spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapSelected: {
    backgroundColor: Colors.primarySoft,
  },
  optionText: { flex: 1 },
  optionLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  optionLabelSelected: { color: Colors.primary },
  optionDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, paddingBottom: Spacing.xl + 20, backgroundColor: Colors.background },
  nextButton: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  nextButtonDisabled: { opacity: 0.4 },
  nextButtonText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
});
