import React, { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ScreenErrorBoundary from '../../components/ScreenErrorBoundary';
import {
  View,
  Text,
  SectionList,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Switch,
  Animated,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { hapticImpact, hapticHeavy, hapticLight } from '../../lib/haptics';
import { router } from 'expo-router';
import {
  User,
  Scale,
  Ruler,
  Calendar,
  Users,
  Activity,
  Target,
  Flame,
  Check,
  ChevronDown,
  Zap,
  TrendingDown,
  TrendingUp,
  Minus,
  PieChart,
  Award,
  Sparkles,
  LayoutGrid,
  X,
  RotateCcw,
  Eye,
  EyeOff,
  Settings,
  Trash2,
  AlertTriangle,
  Camera,
  Trophy,
  Dumbbell,
  Moon,
  Pill,
  Bookmark,
  Wind,
  Timer,
  ListChecks,
  HeartPulse,
  BookOpen,
  Brain,
  ShieldAlert,
  Syringe,
  Watch,
  MessageSquare,
  ChefHat,
} from 'lucide-react-native';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Colors, Gradients, Spacing, FontSize, FontWeight, BorderRadius, Shadows, Glass } from '../../constants/theme';
import { useProfile, ACTIVITY_LEVELS, MACRO_PRESETS } from '../../context/ProfileContext';
import { useGamification } from '../../context/GamificationContext';
import { useDashboardLayout } from '../../context/DashboardLayoutContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import useAchievements from '../../hooks/useAchievements';
import { ProfileSkeleton } from '../../components/SkeletonLoader';

// Pre-computed rotation styles to avoid creating new objects on every render
const ROTATE_MINUS_90 = { transform: [{ rotate: '-90deg' }] };
const ROTATE_180 = { transform: [{ rotate: '180deg' }] };
const ROTATE_0 = { transform: [{ rotate: '0deg' }] };

const WEEKLY_GOALS = {
  lose2: { label: 'Lose 2 lbs/week', adjustment: -1000, icon: TrendingDown },
  lose1: { label: 'Lose 1 lb/week', adjustment: -500, icon: TrendingDown },
  lose05: { label: 'Lose 0.5 lbs/week', adjustment: -250, icon: TrendingDown },
  maintain: { label: 'Maintain weight', adjustment: 0, icon: Minus },
  gain05: { label: 'Gain 0.5 lbs/week', adjustment: 250, icon: TrendingUp },
  gain1: { label: 'Gain 1 lb/week', adjustment: 500, icon: TrendingUp },
};

const FormInput = memo(function FormInput({ icon: Icon, iconColor, label, value, onChangeText, placeholder, keyboardType = 'default', suffix }) {
  return (
    <View style={styles.inputContainer}>
      <View style={[styles.inputIcon, { backgroundColor: iconColor + '20' }]}>
        <Icon size={18} color={iconColor} />
      </View>
      <View style={styles.inputContent}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={Colors.textTertiary}
            keyboardType={keyboardType}
          />
          {suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
        </View>
      </View>
    </View>
  );
});

const GenderSelector = memo(function GenderSelector({ value, onChange }) {
  return (
    <View style={styles.inputContainer}>
      <View style={[styles.inputIcon, { backgroundColor: Colors.accent + '20' }]}>
        <Users size={18} color={Colors.accent} />
      </View>
      <View style={styles.inputContent}>
        <Text style={styles.inputLabel}>Gender</Text>
        <View style={styles.genderButtons}>
          <Pressable
            style={[styles.genderButton, value === 'male' && styles.genderButtonActive]}
            onPress={() => onChange('male')}
          >
            <Text style={[styles.genderButtonText, value === 'male' && styles.genderButtonTextActive]}>
              Male
            </Text>
          </Pressable>
          <Pressable
            style={[styles.genderButton, value === 'female' && styles.genderButtonActive]}
            onPress={() => onChange('female')}
          >
            <Text style={[styles.genderButtonText, value === 'female' && styles.genderButtonTextActive]}>
              Female
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const ActivitySelector = memo(function ActivitySelector({ value, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const currentLevel = ACTIVITY_LEVELS[value];

  return (
    <View style={styles.selectorContainer}>
      <Pressable style={styles.selectorHeader} onPress={() => setExpanded(!expanded)}>
        <View style={[styles.inputIcon, { backgroundColor: Colors.warning + '20' }]}>
          <Activity size={18} color={Colors.warning} />
        </View>
        <View style={styles.selectorContent}>
          <Text style={styles.inputLabel}>Activity Level</Text>
          <Text style={styles.selectorValue}>{currentLevel?.label}</Text>
          <Text style={styles.selectorDescription}>{currentLevel?.description}</Text>
        </View>
        <ChevronDown
          size={20}
          color={Colors.textSecondary}
          style={expanded ? ROTATE_180 : ROTATE_0}
        />
      </Pressable>
      {expanded && (
        <View style={styles.selectorOptions}>
          {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
            <Pressable
              key={key}
              style={[styles.selectorOption, value === key && styles.selectorOptionActive]}
              onPress={() => {
                onChange(key);
                setExpanded(false);
              }}
            >
              <View style={styles.selectorOptionContent}>
                <Text style={[styles.selectorOptionLabel, value === key && styles.selectorOptionLabelActive]}>
                  {level.label}
                </Text>
                <Text style={styles.selectorOptionDesc}>{level.description}</Text>
              </View>
              {value === key && <Check size={18} color={Colors.primary} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
});

const WeeklyGoalSelector = memo(function WeeklyGoalSelector({ value, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const currentGoal = WEEKLY_GOALS[value];
  const GoalIcon = currentGoal?.icon || Minus;

  return (
    <View style={styles.selectorContainer}>
      <Pressable style={styles.selectorHeader} onPress={() => setExpanded(!expanded)}>
        <View style={[styles.inputIcon, { backgroundColor: Colors.primary + '20' }]}>
          <Target size={18} color={Colors.primary} />
        </View>
        <View style={styles.selectorContent}>
          <Text style={styles.inputLabel}>Weekly Goal</Text>
          <View style={styles.goalValueRow}>
            <GoalIcon size={16} color={Colors.text} />
            <Text style={styles.selectorValue}>{currentGoal?.label}</Text>
          </View>
        </View>
        <ChevronDown
          size={20}
          color={Colors.textSecondary}
          style={expanded ? ROTATE_180 : ROTATE_0}
        />
      </Pressable>
      {expanded && (
        <View style={styles.selectorOptions}>
          {Object.entries(WEEKLY_GOALS).map(([key, goal]) => {
            const Icon = goal.icon;
            return (
              <Pressable
                key={key}
                style={[styles.selectorOption, value === key && styles.selectorOptionActive]}
                onPress={() => {
                  onChange(key);
                  setExpanded(false);
                }}
              >
                <View style={styles.selectorOptionContent}>
                  <View style={styles.goalOptionRow}>
                    <Icon size={16} color={value === key ? Colors.primary : Colors.textSecondary} />
                    <Text style={[styles.selectorOptionLabel, value === key && styles.selectorOptionLabelActive]}>
                      {goal.label}
                    </Text>
                  </View>
                </View>
                {value === key && <Check size={18} color={Colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
});

const MacroSplitSelector = memo(function MacroSplitSelector({ value, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const currentPreset = MACRO_PRESETS[value] || MACRO_PRESETS.balanced;

  return (
    <View style={styles.selectorContainer}>
      <Pressable style={styles.selectorHeader} onPress={() => setExpanded(!expanded)}>
        <View style={[styles.inputIcon, { backgroundColor: Colors.protein + '20' }]}>
          <PieChart size={18} color={Colors.protein} />
        </View>
        <View style={styles.selectorContent}>
          <Text style={styles.inputLabel}>Macro Split</Text>
          <Text style={styles.selectorValue}>{currentPreset.label}</Text>
          <Text style={styles.selectorDescription}>
            {currentPreset.isBodyweightBased
              ? '2g protein/kg, 0.8g fat/kg'
              : `${currentPreset.protein}% P / ${currentPreset.carbs}% C / ${currentPreset.fat}% F`}
          </Text>
        </View>
        <ChevronDown
          size={20}
          color={Colors.textSecondary}
          style={expanded ? ROTATE_180 : ROTATE_0}
        />
      </Pressable>
      {expanded && (
        <View style={styles.selectorOptions}>
          {Object.entries(MACRO_PRESETS).filter(([key]) => key !== 'custom').map(([key, preset]) => (
            <Pressable
              key={key}
              style={[styles.selectorOption, value === key && styles.selectorOptionActive]}
              onPress={() => {
                onChange(key);
                setExpanded(false);
              }}
            >
              <View style={styles.selectorOptionContent}>
                <View style={styles.macroPresetHeader}>
                  <Text style={[styles.selectorOptionLabel, value === key && styles.selectorOptionLabelActive]}>
                    {preset.label}
                  </Text>
                  {preset.isBodyweightBased && (
                    <View style={styles.recommendedBadge}>
                      <Sparkles size={10} color={Colors.primary} />
                      <Text style={styles.recommendedText}>Recommended</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.selectorOptionDesc}>{preset.description}</Text>
                {!preset.isBodyweightBased && (
                  <View style={styles.macroSplitBadges}>
                    <View style={[styles.macroBadge, { backgroundColor: Colors.protein + '20' }]}>
                      <Text style={[styles.macroBadgeText, { color: Colors.protein }]}>{preset.protein}% P</Text>
                    </View>
                    <View style={[styles.macroBadge, { backgroundColor: Colors.carbs + '20' }]}>
                      <Text style={[styles.macroBadgeText, { color: Colors.carbs }]}>{preset.carbs}% C</Text>
                    </View>
                    <View style={[styles.macroBadge, { backgroundColor: Colors.fat + '20' }]}>
                      <Text style={[styles.macroBadgeText, { color: Colors.fat }]}>{preset.fat}% F</Text>
                    </View>
                  </View>
                )}
              </View>
              {value === key && <Check size={18} color={Colors.primary} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
});

const BMRCard = memo(function BMRCard({ bmr, tdee, calorieGoal }) {
  if (!bmr || !tdee) return null;

  return (
    <View style={styles.bmrCard}>
      <View style={styles.bmrHeader}>
        <Flame size={20} color={Colors.warning} />
        <Text style={styles.bmrTitle}>Your Metabolism</Text>
      </View>
      <View style={styles.bmrStats}>
        <View style={styles.bmrStat}>
          <Text style={styles.bmrValue}>{bmr.toLocaleString()}</Text>
          <Text style={styles.bmrLabel}>BMR</Text>
          <Text style={styles.bmrDesc}>Basal Metabolic Rate</Text>
        </View>
        <View style={styles.bmrDivider} />
        <View style={styles.bmrStat}>
          <Text style={styles.bmrValue}>{tdee.toLocaleString()}</Text>
          <Text style={styles.bmrLabel}>TDEE</Text>
          <Text style={styles.bmrDesc}>Daily Energy Expenditure</Text>
        </View>
      </View>
      <View style={styles.calorieGoalContainer}>
        <Zap size={18} color={Colors.primary} />
        <Text style={styles.calorieGoalLabel}>Your Daily Calorie Goal</Text>
        <Text style={styles.calorieGoalValue}>{calorieGoal.toLocaleString()} kcal</Text>
      </View>
    </View>
  );
});

const LevelCard = memo(function LevelCard({ levelInfo, totalXP, currentStreak }) {
  const progressPercent = Math.round(levelInfo.progress * 100);

  return (
    <View style={styles.levelCard}>
      <View style={styles.levelHeader}>
        <View style={styles.levelBadge}>
          <Award size={24} color={Colors.gold} />
        </View>
        <View style={styles.levelInfo}>
          <Text style={styles.levelTitle}>Level {levelInfo.level}</Text>
          <Text style={styles.levelName}>{levelInfo.name}</Text>
        </View>
        <View style={styles.streakContainer}>
          <Flame size={16} color={Colors.warning} />
          <Text style={styles.streakValue}>{currentStreak}</Text>
        </View>
      </View>

      <View style={styles.xpContainer}>
        <View style={styles.xpHeader}>
          <View style={styles.xpLabelRow}>
            <Sparkles size={14} color={Colors.gold} />
            <Text style={styles.xpLabel}>Vibe Points</Text>
          </View>
          <Text style={styles.xpValue}>{totalXP.toLocaleString()} XP</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>{progressPercent}%</Text>
          {levelInfo.xpToNext > 0 && (
            <Text style={styles.progressLabel}>{levelInfo.xpToNext.toLocaleString()} XP to next level</Text>
          )}
        </View>
      </View>

      <View style={styles.xpRewardsContainer}>
        <Text style={styles.xpRewardsTitle}>Earn XP</Text>
        <View style={styles.xpRewardsRow}>
          <View style={styles.xpRewardItem}>
            <Text style={styles.xpRewardAmount}>+10</Text>
            <Text style={styles.xpRewardLabel}>Food</Text>
          </View>
          <View style={styles.xpRewardItem}>
            <Text style={styles.xpRewardAmount}>+5</Text>
            <Text style={styles.xpRewardLabel}>Water</Text>
          </View>
          <View style={styles.xpRewardItem}>
            <Text style={styles.xpRewardAmount}>+50</Text>
            <Text style={styles.xpRewardLabel}>Exercise</Text>
          </View>
          <View style={styles.xpRewardItem}>
            <Text style={styles.xpRewardAmount}>+30</Text>
            <Text style={styles.xpRewardLabel}>Fast</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

// Data-driven nav items — replaces 30+ inline Pressable blocks
const NAV_ITEMS = [
  { key: 'workout-history', title: 'Workout History', subtitle: 'View past workouts and personal records', icon: 'Dumbbell', colors: ['rgba(255, 107, 53, 0.1)', 'rgba(255, 107, 53, 0.05)'], iconColor: null, borderColor: null, route: '/workout-history' },
  { key: 'progress-photos', title: 'Progress Photos', subtitle: 'Track your transformation over time', icon: 'Camera', colors: ['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.05)'], iconColor: null, borderColor: null, route: '/progress-photos' },
  { key: 'weight-log', title: 'Weight Tracker', subtitle: 'Log and visualize your weight journey', icon: 'Scale', colors: ['rgba(0, 230, 118, 0.1)', 'rgba(0, 230, 118, 0.05)'], iconColor: 'success', borderColor: null, route: '/weight-log' },
  { key: 'goal-timeline', title: 'Goal Timeline', subtitle: 'Projections, milestones & completion date', icon: 'Target', colors: ['rgba(0, 230, 118, 0.1)', 'rgba(0, 230, 118, 0.05)'], iconColor: 'success', borderColor: 'rgba(0, 230, 118, 0.3)', route: '/goal-timeline' },
  { key: 'body-measurements', title: 'Body Measurements', subtitle: 'Track chest, waist, hips and more', icon: 'Ruler', colors: ['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.05)'], iconColor: null, borderColor: null, route: '/body-measurements' },
  { key: 'sleep-tracker', title: 'Sleep Tracker', subtitle: 'Log and analyze your sleep patterns', icon: 'Moon', colors: ['rgba(138, 43, 226, 0.1)', 'rgba(138, 43, 226, 0.05)'], iconColor: '#A78BFA', borderColor: 'rgba(167, 139, 250, 0.3)', route: '/sleep-tracker' },
  { key: 'supplements', title: 'Supplements', subtitle: 'Track vitamins and supplement intake', icon: 'Pill', colors: ['rgba(20, 184, 166, 0.1)', 'rgba(20, 184, 166, 0.05)'], iconColor: '#14B8A6', borderColor: 'rgba(20, 184, 166, 0.3)', route: '/supplements' },
  { key: 'glp1-support', title: 'GLP-1 Support', subtitle: 'Ozempic, Wegovy, Mounjaro tracking & nutrition', icon: 'Syringe', colors: ['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.05)'], iconColor: '#00D4FF', borderColor: 'rgba(0, 212, 255, 0.3)', route: '/glp1-support' },
  { key: 'workout-templates', title: 'Workout Templates', subtitle: 'Save and reuse your favorite workouts', icon: 'Bookmark', colors: ['rgba(255, 107, 53, 0.1)', 'rgba(255, 107, 53, 0.05)'], iconColor: 'secondary', borderColor: 'rgba(255, 107, 53, 0.3)', route: '/workout-templates' },
  { key: 'exercise-library', title: 'Exercise Library', subtitle: 'Browse 140+ exercises with form tips', icon: 'BookOpen', colors: ['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.05)'], iconColor: null, borderColor: 'rgba(0, 212, 255, 0.3)', route: '/exercise-library' },
  { key: 'breathing', title: 'Breathing & Meditation', subtitle: 'Guided breathing exercises for wellness', icon: 'Wind', colors: ['rgba(100, 149, 237, 0.1)', 'rgba(100, 149, 237, 0.05)'], iconColor: '#6495ED', borderColor: 'rgba(100, 149, 237, 0.3)', route: '/breathing' },
  { key: 'fasting-analytics', title: 'Fasting Insights', subtitle: 'Analytics and zones for your fasts', icon: 'Timer', colors: ['rgba(0, 230, 118, 0.1)', 'rgba(0, 230, 118, 0.05)'], iconColor: 'success', borderColor: 'rgba(0, 230, 118, 0.3)', route: '/fasting-analytics' },
  { key: 'nutrition-insights', title: 'Nutrition Insights', subtitle: 'Daily score, meal timing and tips', icon: 'Award', colors: ['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.05)'], iconColor: 'gold', borderColor: 'rgba(255, 215, 0, 0.3)', route: '/nutrition-insights' },
  { key: 'habits', title: 'Habit Tracker', subtitle: 'Build and track daily habits', icon: 'ListChecks', colors: ['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.05)'], iconColor: null, borderColor: 'rgba(0, 212, 255, 0.3)', route: '/habits' },
  { key: 'recovery', title: 'Recovery Tracker', subtitle: 'Track readiness, soreness and recovery', icon: 'HeartPulse', colors: ['rgba(255, 82, 82, 0.1)', 'rgba(255, 107, 53, 0.05)'], iconColor: 'error', borderColor: 'rgba(255, 82, 82, 0.3)', route: '/recovery' },
  { key: 'activity-calendar', title: 'Activity Calendar', subtitle: 'GitHub-style heatmap of your daily activity', icon: 'Calendar', colors: ['rgba(0, 212, 255, 0.12)', 'rgba(0, 212, 255, 0.04)'], iconColor: null, borderColor: 'rgba(0, 212, 255, 0.3)', route: '/activity-calendar' },
  { key: 'allergens', title: 'Allergens & Sensitivities', subtitle: 'Track food allergens and reactions', icon: 'ShieldAlert', colors: ['rgba(255, 82, 82, 0.1)', 'rgba(255, 107, 157, 0.05)'], iconColor: '#FF6B9D', borderColor: 'rgba(255, 107, 157, 0.3)', route: '/allergens' },
  { key: 'workout-programs', title: 'Workout Programs', subtitle: 'Structured training plans and programs', icon: 'Dumbbell', colors: ['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.05)'], iconColor: null, borderColor: 'rgba(0, 212, 255, 0.3)', route: '/workout-programs' },
  { key: 'mood-insights', title: 'Mood Insights', subtitle: 'Track and analyze your mood patterns', icon: 'Brain', colors: ['rgba(191, 90, 242, 0.1)', 'rgba(191, 90, 242, 0.05)'], iconColor: '#BF5AF2', borderColor: 'rgba(191, 90, 242, 0.3)', route: '/mood-insights' },
  { key: 'food-journal', title: 'Food Journal', subtitle: 'Log meals and track your daily nutrition', icon: 'BookOpen', colors: ['rgba(255, 179, 0, 0.1)', 'rgba(255, 179, 0, 0.05)'], iconColor: 'warning', borderColor: 'rgba(255, 179, 0, 0.3)', route: '/food-journal' },
  { key: 'meal-timing', title: 'Meal Timing', subtitle: 'Optimize when you eat for better results', icon: 'Timer', colors: ['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.05)'], iconColor: null, borderColor: 'rgba(0, 212, 255, 0.3)', route: '/meal-timing' },
  { key: 'food-compare', title: 'Food Compare', subtitle: 'Compare nutritional values side by side', icon: 'Scale', colors: ['rgba(0, 230, 118, 0.1)', 'rgba(0, 230, 118, 0.05)'], iconColor: 'success', borderColor: 'rgba(0, 230, 118, 0.3)', route: '/food-compare' },
  { key: 'fitness-score', title: 'Fitness Score', subtitle: 'Your overall fitness health score', icon: 'HeartPulse', colors: ['rgba(255, 82, 82, 0.1)', 'rgba(255, 82, 82, 0.05)'], iconColor: '#FF5252', borderColor: 'rgba(255, 82, 82, 0.3)', route: '/fitness-score' },
  { key: 'social-feed', title: 'Community Feed', subtitle: 'Share achievements and celebrate wins', icon: 'Trophy', colors: ['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.05)'], iconColor: null, borderColor: 'rgba(0, 212, 255, 0.3)', route: '/social-feed' },
  { key: 'community-challenges', title: 'Community Challenges', subtitle: 'Join challenges and compete with friends', icon: 'Award', colors: ['rgba(255, 179, 0, 0.1)', 'rgba(255, 179, 0, 0.05)'], iconColor: 'warning', borderColor: 'rgba(255, 179, 0, 0.3)', route: '/community-challenges' },
  { key: 'friends', title: 'Friends', subtitle: 'Connect and compete with friends', icon: 'Users', colors: ['rgba(0, 230, 118, 0.1)', 'rgba(0, 230, 118, 0.05)'], iconColor: 'success', borderColor: 'rgba(0, 230, 118, 0.3)', route: '/friends' },
  { key: 'journal', title: 'Wellness Journal', subtitle: 'Daily reflection and mood tracking', icon: 'BookOpen', colors: ['rgba(167, 139, 250, 0.1)', 'rgba(167, 139, 250, 0.05)'], iconColor: '#A78BFA', borderColor: 'rgba(167, 139, 250, 0.3)', route: '/journal' },
  { key: 'biometric-dashboard', title: 'Biometric Dashboard', subtitle: 'Heart rate, VO2 max & health metrics', icon: 'HeartPulse', colors: ['rgba(255, 82, 82, 0.1)', 'rgba(255, 82, 82, 0.05)'], iconColor: '#FF5252', borderColor: 'rgba(255, 82, 82, 0.3)', route: '/biometric-dashboard' },
  { key: 'ai-coaching', title: 'AI Coach', subtitle: 'Training plans, deload & injury prevention', icon: 'Brain', colors: ['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.05)'], iconColor: null, borderColor: 'rgba(0, 212, 255, 0.3)', route: '/ai-coaching' },
  { key: 'calorie-cycling', title: 'Calorie Cycling', subtitle: 'Strategic calorie variation for results', icon: 'Flame', colors: ['rgba(255, 179, 0, 0.1)', 'rgba(255, 179, 0, 0.05)'], iconColor: 'warning', borderColor: 'rgba(255, 179, 0, 0.3)', route: '/calorie-cycling' },
  { key: 'wearable-connections', title: 'Connected Devices', subtitle: 'Fitbit, Garmin, WHOOP & Withings sync', icon: 'Watch', colors: ['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.05)'], iconColor: null, borderColor: 'rgba(0, 212, 255, 0.3)', route: '/wearable-connections' },
  { key: 'groups', title: 'Groups & Forums', subtitle: 'Join communities and discussion groups', icon: 'MessageSquare', colors: ['rgba(0, 230, 118, 0.1)', 'rgba(0, 230, 118, 0.05)'], iconColor: 'success', borderColor: 'rgba(0, 230, 118, 0.3)', route: '/groups' },
  { key: 'recipe-discovery', title: 'Recipe Discovery', subtitle: 'Browse 60+ curated healthy recipes', icon: 'ChefHat', colors: ['rgba(255, 179, 0, 0.1)', 'rgba(255, 179, 0, 0.05)'], iconColor: 'warning', borderColor: 'rgba(255, 179, 0, 0.3)', route: '/recipe-discovery' },
];

const ICON_MAP = {
  Dumbbell, Camera, Scale, Target, Ruler, Moon, Pill, Bookmark,
  BookOpen, Wind, Timer, Award, ListChecks, HeartPulse, Calendar,
  ShieldAlert, Brain, Trophy, Users, Flame, Syringe, Watch, MessageSquare, ChefHat,
};

const NavButton = memo(function NavButton({ item, onNavigate }) {
  const IconComponent = ICON_MAP[item.icon] || Activity;
  const resolvedColor = item.iconColor
    ? (Colors[item.iconColor] || item.iconColor)
    : Colors.primary;

  return (
    <Pressable
      style={[styles.editLayoutButton, item.borderColor && { borderColor: item.borderColor }]}
      onPress={() => onNavigate(item.route)}
    >
      <LinearGradient colors={item.colors} style={styles.editLayoutGradient}>
        <IconComponent size={20} color={resolvedColor} />
        <View style={styles.editLayoutContent}>
          <Text style={styles.editLayoutTitle}>{item.title}</Text>
          <Text style={styles.editLayoutSubtitle}>{item.subtitle}</Text>
        </View>
        <ChevronDown size={18} color={Colors.textSecondary} style={ROTATE_MINUS_90} />
      </LinearGradient>
    </Pressable>
  );
});

// Edit Layout Modal Component
const EditLayoutModal = memo(function EditLayoutModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { getAllCards, toggleCardVisibility, resetLayout } = useDashboardLayout();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const cards = getAllCards();

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible, slideAnim]);

  const handleToggle = async (cardKey) => {
    await hapticLight();
    toggleCardVisibility(cardKey);
  };

  const handleReset = async () => {
    await hapticImpact();
    resetLayout();
  };

  const handleClose = async () => {
    await hapticLight();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <BlurView intensity={40} tint="dark" style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.layoutModal,
            {
              paddingBottom: insets.bottom + Spacing.lg,
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                }),
              }],
            },
          ]}
        >
          <LinearGradient
            colors={Gradients.card}
            style={styles.layoutModalGradient}
          >
            {/* Modal Header */}
            <View style={styles.layoutModalHeader}>
              <View style={styles.layoutModalTitleRow}>
                <LayoutGrid size={22} color={Colors.primary} />
                <Text style={styles.layoutModalTitle}>Dashboard Layout</Text>
              </View>
              <Pressable onPress={handleClose} style={styles.modalCloseButton}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.layoutModalSubtitle}>
              Toggle which cards appear on your dashboard
            </Text>

            {/* Card List */}
            <ScrollView style={styles.layoutCardList} showsVerticalScrollIndicator={false}>
              {cards.map((card) => (
                <View key={card.key} style={styles.layoutCardItem}>
                  <View style={styles.layoutCardInfo}>
                    {card.visible ? (
                      <Eye size={18} color={Colors.primary} />
                    ) : (
                      <EyeOff size={18} color={Colors.textTertiary} />
                    )}
                    <View style={styles.layoutCardText}>
                      <Text style={[
                        styles.layoutCardLabel,
                        !card.visible && styles.layoutCardLabelHidden,
                      ]}>
                        {card.label}
                      </Text>
                      <Text style={styles.layoutCardDesc}>{card.description}</Text>
                    </View>
                  </View>
                  <Switch
                    value={card.visible}
                    onValueChange={() => handleToggle(card.key)}
                    trackColor={{ false: Colors.surfaceElevated, true: Colors.primary + '50' }}
                    thumbColor={card.visible ? Colors.primary : Colors.textTertiary}
                  />
                </View>
              ))}
            </ScrollView>

            {/* Reset Button */}
            <Pressable style={styles.resetLayoutButton} onPress={handleReset}>
              <RotateCcw size={18} color={Colors.textSecondary} />
              <Text style={styles.resetLayoutText}>Reset to Default</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </BlurView>
    </Modal>
  );
});

function ProfileScreenInner() {
  const { profile, isLoading, updateProfile, calculatedGoals, isProfileComplete } = useProfile();
  const { levelInfo, totalXP, currentStreak } = useGamification();
  const { unlockedCount, totalCount, newUnlocked } = useAchievements();
  const { user, signOut } = useAuth();

  // Local form state
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [weeklyGoal, setWeeklyGoal] = useState('maintain');
  const [macroPreset, setMacroPreset] = useState('balanced');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form with saved profile
  useEffect(() => {
    if (!isLoading && profile) {
      setName(profile.name || '');
      setWeight(profile.weight ? String(profile.weight) : '');
      setHeight(profile.height ? String(profile.height) : '');
      setAge(profile.age ? String(profile.age) : '');
      setGender(profile.gender || 'male');
      setActivityLevel(profile.activityLevel || 'moderate');
      setWeeklyGoal(profile.weeklyGoal || 'maintain');
      setMacroPreset(profile.macroPreset || 'balanced');
    }
  }, [isLoading, profile]);

  // Track changes
  useEffect(() => {
    if (isLoading) return;
    const hasChanged =
      name !== (profile.name || '') ||
      weight !== (profile.weight ? String(profile.weight) : '') ||
      height !== (profile.height ? String(profile.height) : '') ||
      age !== (profile.age ? String(profile.age) : '') ||
      gender !== (profile.gender || 'male') ||
      activityLevel !== (profile.activityLevel || 'moderate') ||
      weeklyGoal !== (profile.weeklyGoal || 'maintain') ||
      macroPreset !== (profile.macroPreset || 'balanced');
    setHasChanges(hasChanged);
  }, [name, weight, height, age, gender, activityLevel, weeklyGoal, macroPreset, profile, isLoading]);

  const handleSave = async () => {
    await hapticLight();
    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        weight: parseFloat(weight) || null,
        height: parseFloat(height) || null,
        age: parseInt(age, 10) || null,
        gender,
        activityLevel,
        weeklyGoal,
        macroPreset,
      });
      await hapticImpact();
      setHasChanges(false);
    } catch (error) {
      Alert.alert('Save Failed', 'Could not save your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenLayoutModal = useCallback(async () => {
    await hapticLight();
    setShowLayoutModal(true);
  }, []);

  const handleNavigate = useCallback(async (route) => {
    await hapticLight();
    router.push(route);
  }, [router]);

  // Handle account deletion - Apple App Store compliance requirement
  const handleDeleteAccount = async () => {
    await hapticHeavy();

    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data including:\n\n' +
      '- Profile information\n' +
      '- Food logs\n' +
      '- Workout history\n' +
      '- Progress data\n\n' +
      'This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    const errors = [];

    try {
      // Delete all user data from Supabase tables
      // Order matters - delete child records first

      // 1. Delete recipe_ingredients (child of recipes)
      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .in('recipe_id',
          supabase.from('recipes').select('id').eq('user_id', user.id)
        );

      if (ingredientsError) {
        if (__DEV__) console.error('Error deleting recipe_ingredients:', ingredientsError.message);
        // Non-critical: continue even if this fails (may not have recipes)
      }

      // 2. Delete recipes
      const { error: recipeError } = await supabase
        .from('recipes')
        .delete()
        .eq('user_id', user.id);

      if (recipeError) {
        if (__DEV__) console.error('Error deleting recipes:', recipeError.message);
      }

      // 3. Delete food_logs (includes water and meals)
      const { error: foodError } = await supabase
        .from('food_logs')
        .delete()
        .eq('user_id', user.id);

      if (foodError) {
        errors.push('food_logs');
        if (__DEV__) console.error('Error deleting food_logs:', foodError.message);
      }

      // 4. Delete workouts
      const { error: workoutError } = await supabase
        .from('workouts')
        .delete()
        .eq('user_id', user.id);

      if (workoutError) {
        errors.push('workouts');
        if (__DEV__) console.error('Error deleting workouts:', workoutError.message);
      }

      // 5. Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (profileError) {
        errors.push('profile');
        if (__DEV__) console.error('Error deleting profile:', profileError.message);
      }

      // Abort if critical tables failed to delete
      if (errors.length > 0) {
        Alert.alert(
          'Partial Deletion',
          `Some data could not be deleted (${errors.join(', ')}). Please try again or contact support.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // 6. Clear all local AsyncStorage data
      await AsyncStorage.multiRemove([
        '@fueliq_gamification',
        '@fueliq_fasting',
        '@fueliq_recipes',
        '@fueliq_offline_queue',
        '@fueliq_mood_logs',
        '@fueliq_dashboard_layout',
        '@fueliq_chat_history',
        '@fueliq_last_briefing_date',
        '@fueliq_profile_cache',
        '@fueliq_achievements',
        '@fueliq_sleep_history',
        '@fueliq_supplements',
        '@fueliq_supplements_log',
        '@fueliq_water_history',
        '@fueliq_favorite_foods',
        '@fueliq_meal_plan',
        '@fueliq_personal_records',
        '@fueliq_adaptive_macros',
        '@fueliq_daily_challenges',
        '@fueliq_weekly_digest',
        '@fueliq_workout_history',
        '@fueliq_body_measurements',
        '@fueliq_body_measurements_unit',
        '@fueliq_weight_history',
        '@fueliq_weight_goal',
        '@fueliq_workout_templates',
        '@fueliq_breathing_history',
        '@fueliq_fasting_history',
        '@fueliq_habits',
        '@fueliq_habits_log',
        '@fueliq_activity_scores',
        '@fueliq_recovery',
        '@fueliq_allergens',
      ]);

      // 7. Sign out
      await signOut();

      Alert.alert(
        'Account Deleted',
        'Your account and all data have been permanently deleted.',
        [{ text: 'OK' }]
      );

    } catch (error) {
      if (__DEV__) console.error('Account deletion error:', error.message);
      Alert.alert(
        'Error',
        'Failed to delete account. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <ProfileSkeleton />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper testID="profile-screen">
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <ReAnimated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)} style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Profile</Text>
              {isProfileComplete && (
                <View style={styles.completeBadge}>
                  <Check size={14} color={Colors.primary} />
                  <Text style={styles.completeBadgeText}>Complete</Text>
                </View>
              )}
            </View>
            <Pressable
              style={styles.settingsButton}
              onPress={() => handleNavigate('/settings')}
            >
              <Settings size={22} color={Colors.text} />
            </Pressable>
          </ReAnimated.View>

          {/* User Avatar Card */}
          <ReAnimated.View entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)} style={styles.avatarCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'VF'}
              </Text>
            </View>
            <Text style={styles.avatarName}>{name || 'FuelIQ User'}</Text>
            <Text style={styles.avatarSubtitle}>
              {isProfileComplete ? 'Profile configured' : 'Complete your profile below'}
            </Text>
          </ReAnimated.View>

          {/* Level Progress Card */}
          <ReAnimated.View entering={FadeInDown.delay(160).springify().mass(0.5).damping(10)}>
            <LevelCard levelInfo={levelInfo} totalXP={totalXP} currentStreak={currentStreak} />
          </ReAnimated.View>

          {/* Achievements Button */}
          <ReAnimated.View entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}>
            <Pressable
              style={styles.achievementsButton}
              onPress={() => handleNavigate('/achievements')}
            >
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.12)', 'rgba(255, 215, 0, 0.04)']}
                style={styles.achievementsGradient}
              >
                <View style={styles.achievementsIconContainer}>
                  <Trophy size={22} color={Colors.gold} />
                </View>
                <View style={styles.achievementsContent}>
                  <View style={styles.achievementsTitleRow}>
                    <Text style={styles.achievementsTitle}>Achievements</Text>
                    {newUnlocked > 0 && (
                      <View style={styles.achievementsNewBadge}>
                        <Text style={styles.achievementsNewBadgeText}>{newUnlocked} NEW</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.achievementsSubtitle}>
                    {unlockedCount} of {totalCount} unlocked
                  </Text>
                </View>
                <View style={styles.achievementsCountBadge}>
                  <Text style={styles.achievementsCountText}>{unlockedCount}/{totalCount}</Text>
                </View>
                <ChevronDown size={18} color={Colors.textSecondary} style={ROTATE_MINUS_90} />
              </LinearGradient>
            </Pressable>
          </ReAnimated.View>

          {/* Leaderboard Button */}
          <ReAnimated.View entering={FadeInDown.delay(220).springify().mass(0.5).damping(10)}>
            <Pressable
              style={[styles.achievementsButton, { borderColor: 'rgba(255, 215, 0, 0.35)' }]}
              onPress={() => handleNavigate('/leaderboard')}
            >
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.12)', 'rgba(255, 215, 0, 0.04)']}
                style={styles.achievementsGradient}
              >
                <View style={[styles.achievementsIconContainer, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                  <Trophy size={22} color="#FFD700" />
                </View>
                <View style={styles.achievementsContent}>
                  <Text style={styles.achievementsTitle}>Leaderboard</Text>
                  <Text style={styles.achievementsSubtitle}>
                    Compete and climb the ranks
                  </Text>
                </View>
                <ChevronDown size={18} color={Colors.textSecondary} style={ROTATE_MINUS_90} />
              </LinearGradient>
            </Pressable>
          </ReAnimated.View>

          {/* BMR/TDEE Card */}
          <ReAnimated.View entering={FadeInDown.delay(260).springify().mass(0.5).damping(10)}>
            <BMRCard bmr={profile.bmr} tdee={profile.tdee} calorieGoal={calculatedGoals.calories} />
          </ReAnimated.View>

          {/* Body Composition Button */}
          <ReAnimated.View entering={FadeInDown.delay(280).springify().mass(0.5).damping(10)}>
            <Pressable
              style={[styles.editLayoutButton, { borderColor: 'rgba(0, 212, 255, 0.3)' }]}
              onPress={() => handleNavigate('/body-composition')}
            >
              <LinearGradient
                colors={['rgba(0, 212, 255, 0.12)', 'rgba(191, 90, 242, 0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.editLayoutGradient}
              >
                <PieChart size={20} color={Colors.primary} />
                <View style={styles.editLayoutContent}>
                  <Text style={styles.editLayoutTitle}>Body Composition</Text>
                  <Text style={styles.editLayoutSubtitle}>BMI, body fat, lean mass & more</Text>
                </View>
                <ChevronDown size={18} color={Colors.textSecondary} style={ROTATE_MINUS_90} />
              </LinearGradient>
            </Pressable>
          </ReAnimated.View>

          {/* Personal Info Section */}
          <ReAnimated.View entering={FadeInDown.delay(320).springify().mass(0.5).damping(10)}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <View style={styles.formCard}>
            <FormInput
              icon={User}
              iconColor={Colors.primary}
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
            />
            <View style={styles.inputDivider} />
            <FormInput
              icon={Calendar}
              iconColor={Colors.accentPurple}
              label="Age"
              value={age}
              onChangeText={setAge}
              placeholder="Enter your age"
              keyboardType="numeric"
              suffix="years"
            />
            <View style={styles.inputDivider} />
            <GenderSelector value={gender} onChange={setGender} />
          </View>
          </ReAnimated.View>

          {/* Body Metrics Section */}
          <ReAnimated.View entering={FadeInDown.delay(400).springify().mass(0.5).damping(10)}>
          <Text style={styles.sectionTitle}>Body Metrics</Text>
          <View style={styles.formCard}>
            <FormInput
              icon={Scale}
              iconColor={Colors.accent}
              label="Current Weight"
              value={weight}
              onChangeText={setWeight}
              placeholder="Enter weight"
              keyboardType="decimal-pad"
              suffix="lbs"
            />
            <View style={styles.inputDivider} />
            <FormInput
              icon={Ruler}
              iconColor={Colors.carbs}
              label="Height"
              value={height}
              onChangeText={setHeight}
              placeholder="Enter height"
              keyboardType="decimal-pad"
              suffix="inches"
            />
          </View>
          </ReAnimated.View>

          {/* Activity & Goals Section */}
          <ReAnimated.View entering={FadeInDown.delay(480).springify().mass(0.5).damping(10)}>
          <Text style={styles.sectionTitle}>Activity & Goals</Text>
          <View style={styles.formCard}>
            <ActivitySelector value={activityLevel} onChange={setActivityLevel} />
            <View style={styles.inputDivider} />
            <WeeklyGoalSelector value={weeklyGoal} onChange={setWeeklyGoal} />
          </View>

          {/* Macro Goals Section */}
          <Text style={styles.sectionTitle}>Macro Goals</Text>
          <View style={styles.formCard}>
            <MacroSplitSelector value={macroPreset} onChange={setMacroPreset} />
          </View>
          </ReAnimated.View>

          {/* Save Button */}
          <Pressable
            style={[
              styles.saveButton,
              (!hasChanges || isSaving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <>
                <Check size={20} color={Colors.background} />
                <Text style={styles.saveButtonText}>Save Profile</Text>
              </>
            )}
          </Pressable>

          {/* Macro Goals Preview */}
          {isProfileComplete && (
            <View style={styles.macroPreview}>
              <Text style={styles.macroPreviewTitle}>Your Daily Macro Goals</Text>
              <View style={styles.macroPreviewRow}>
                <View style={styles.macroPreviewItem}>
                  <Text style={[styles.macroPreviewValue, { color: Colors.protein }]}>
                    {calculatedGoals.protein}g
                  </Text>
                  <Text style={styles.macroPreviewLabel}>Protein</Text>
                </View>
                <View style={styles.macroPreviewItem}>
                  <Text style={[styles.macroPreviewValue, { color: Colors.carbs }]}>
                    {calculatedGoals.carbs}g
                  </Text>
                  <Text style={styles.macroPreviewLabel}>Carbs</Text>
                </View>
                <View style={styles.macroPreviewItem}>
                  <Text style={[styles.macroPreviewValue, { color: Colors.fat }]}>
                    {calculatedGoals.fat}g
                  </Text>
                  <Text style={styles.macroPreviewLabel}>Fat</Text>
                </View>
              </View>
            </View>
          )}

          {/* Virtualized Nav Buttons — FlatList for windowed rendering */}
          <View style={styles.navListContainer}>
            <SectionList
              sections={[{ title: 'nav', data: NAV_ITEMS }]}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => <NavButton item={item} onNavigate={handleNavigate} />}
              renderSectionHeader={() => null}
              scrollEnabled={false}
              initialNumToRender={8}
              maxToRenderPerBatch={5}
              windowSize={3}
              getItemLayout={(data, index) => ({ length: 72, offset: 72 * index, index })}
              ListFooterComponent={
                <>
                  {/* Edit Dashboard Layout Button */}
                  <Pressable style={styles.editLayoutButton} onPress={handleOpenLayoutModal}>
                    <LinearGradient
                      colors={['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.05)']}
                      style={styles.editLayoutGradient}
                    >
                      <LayoutGrid size={20} color={Colors.primary} />
                      <View style={styles.editLayoutContent}>
                        <Text style={styles.editLayoutTitle}>Edit Dashboard Layout</Text>
                        <Text style={styles.editLayoutSubtitle}>Customize which cards appear</Text>
                      </View>
                      <ChevronDown size={18} color={Colors.textSecondary} style={ROTATE_MINUS_90} />
                    </LinearGradient>
                  </Pressable>

                  {/* Danger Zone - Account Deletion (Apple Compliance) */}
                  <View style={styles.dangerZone}>
                    <View style={styles.dangerZoneHeader}>
                      <AlertTriangle size={18} color={Colors.error} />
                      <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
                    </View>
                    <Pressable
                      style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
                      onPress={handleDeleteAccount}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size="small" color={Colors.text} />
                      ) : (
                        <>
                          <Trash2 size={18} color={Colors.text} />
                          <Text style={styles.deleteButtonText}>Delete Account</Text>
                        </>
                      )}
                    </Pressable>
                    <Text style={styles.dangerZoneWarning}>
                      This will permanently delete your account and all data.
                    </Text>
                  </View>

                  {/* Version */}
                  <Text style={styles.version}>FuelIQ v1.0.0</Text>
                  <View style={styles.bottomSpacer} />
                </>
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Edit Layout Modal */}
      <EditLayoutModal
        visible={showLayoutModal}
        onClose={() => setShowLayoutModal(false)}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  completeBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  avatarCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  avatarName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  avatarSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  // Level Card styles
  levelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  levelName: {
    fontSize: FontSize.sm,
    color: Colors.gold,
    fontWeight: FontWeight.medium,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  streakValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.warning,
  },
  xpContainer: {
    marginTop: Spacing.sm,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  xpLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  xpLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  xpValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  progressLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  xpRewardsContainer: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  xpRewardsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  xpRewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  xpRewardItem: {
    alignItems: 'center',
  },
  xpRewardAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  xpRewardLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  bmrCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bmrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  bmrTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  bmrStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  bmrStat: {
    flex: 1,
    alignItems: 'center',
  },
  bmrValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  bmrLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
    marginTop: 4,
  },
  bmrDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  bmrDivider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.border,
  },
  calorieGoalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  calorieGoalLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  calorieGoalValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    padding: 0,
  },
  inputSuffix: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginLeft: Spacing.xs,
  },
  inputDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 60,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  genderButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
  },
  genderButtonActive: {
    backgroundColor: Colors.primary,
  },
  genderButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  genderButtonTextActive: {
    color: Colors.background,
  },
  selectorContainer: {
    overflow: 'hidden',
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  selectorContent: {
    flex: 1,
  },
  selectorValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  selectorDescription: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  goalValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  selectorOptions: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  selectorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingLeft: 60,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectorOptionActive: {
    backgroundColor: Colors.primary + '10',
  },
  selectorOptionContent: {
    flex: 1,
  },
  selectorOptionLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  selectorOptionLabelActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  selectorOptionDesc: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  goalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.surfaceElevated,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  macroPreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  macroPreviewTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  macroPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroPreviewItem: {
    alignItems: 'center',
  },
  macroPreviewValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  macroPreviewLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  macroSplitBadges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  macroBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  macroBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  macroPresetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  recommendedText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  // Achievements Button styles
  achievementsButton: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gold + '30',
  },
  achievementsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  achievementsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementsContent: {
    flex: 1,
  },
  achievementsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  achievementsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  achievementsNewBadge: {
    backgroundColor: Colors.goldSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  achievementsNewBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  achievementsSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  achievementsCountBadge: {
    backgroundColor: Colors.goldSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  achievementsCountText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },
  version: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
  bottomSpacer: {
    height: 140,
  },
  // Edit Layout Button styles
  editLayoutButton: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  editLayoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  editLayoutContent: {
    flex: 1,
  },
  editLayoutTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  editLayoutSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Edit Layout Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  layoutModal: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  layoutModalGradient: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
  },
  layoutModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  layoutModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  layoutModalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  layoutModalSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  layoutCardList: {
    maxHeight: 350,
    paddingHorizontal: Spacing.lg,
  },
  layoutCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  layoutCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  layoutCardText: {
    flex: 1,
  },
  layoutCardLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  layoutCardLabelHidden: {
    color: Colors.textTertiary,
  },
  layoutCardDesc: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  resetLayoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceElevated,
  },
  resetLayoutText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  // Danger Zone - Account Deletion styles
  dangerZone: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.error + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  dangerZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dangerZoneTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.error,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  dangerZoneWarning: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

export default function ProfileScreen(props) {
  return (
    <ScreenErrorBoundary screenName="ProfileScreen">
      <ProfileScreenInner {...props} />
    </ScreenErrorBoundary>
  );
}
