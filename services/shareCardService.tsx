/**
 * Share Card Service - FuelIQ Social Sharing
 *
 * Generates shareable card images using react-native-view-shot + expo-sharing.
 * Supports multiple card types: daily-summary, streak, workout-complete,
 * weight-milestone, and achievement.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const SHARE_CARD_WIDTH: number = SCREEN_WIDTH - 48;
export const SHARE_CARD_HEIGHT: number = SHARE_CARD_WIDTH * 1.5;

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type ShareCardType =
  | 'daily-summary'
  | 'streak'
  | 'workout-complete'
  | 'weight-milestone'
  | 'achievement';

export interface DailySummaryData {
  caloriesConsumed?: number;
  caloriesGoal?: number;
  protein?: number;
  proteinGoal?: number;
  carbs?: number;
  carbsGoal?: number;
  fat?: number;
  fatGoal?: number;
  streak?: number;
  date?: Date;
}

export interface StreakData {
  streak: number;
}

export interface WorkoutCompleteData {
  workoutName?: string;
  duration?: number;
  caloriesBurned?: number;
  exerciseCount?: number;
}

export interface WeightMilestoneData {
  currentWeight?: number | string;
  change?: number;
  unit?: string;
}

export interface AchievementData {
  emoji?: string;
  title?: string;
  description?: string;
}

export type ShareCardData =
  | DailySummaryData
  | StreakData
  | WorkoutCompleteData
  | WeightMilestoneData
  | AchievementData;

export interface ShareResult {
  success: boolean;
  method: 'image' | 'text' | 'none';
}

export interface SaveResult {
  success: boolean;
  uri: string | null;
}

interface StreakTier {
  label: string;
  color: string;
  gradient: string[];
  accent: string;
}

// ----------------------------------------------------------------
// Motivational quotes for streak cards
// ----------------------------------------------------------------
const STREAK_QUOTES: string[] = [
  'Consistency beats perfection.',
  'Small steps every day.',
  'You are what you do repeatedly.',
  'The grind never lies.',
  'Discipline is choosing what you want most.',
  'Progress, not perfection.',
  'Champions train, losers complain.',
  'Trust the process.',
  'One day at a time.',
  'Stay hungry, stay foolish.',
];

function getStreakQuote(streak: number): string {
  return STREAK_QUOTES[streak % STREAK_QUOTES.length];
}

// ----------------------------------------------------------------
// Card tier colors based on streak length
// ----------------------------------------------------------------
function getStreakTier(streak: number): StreakTier {
  if (streak >= 30)
    return {
      label: 'LEGENDARY',
      color: '#FFD700',
      gradient: ['#1A0F00', '#2A1800', '#1A0F00'],
      accent: '#FFD700',
    };
  if (streak >= 14)
    return {
      label: 'ELITE',
      color: '#E040FB',
      gradient: ['#1A0028', '#2D004E', '#1A0028'],
      accent: '#E040FB',
    };
  if (streak >= 7)
    return {
      label: 'ON FIRE',
      color: '#FF6B35',
      gradient: ['#1A0800', '#3D1200', '#1A0800'],
      accent: '#FF6B35',
    };
  return {
    label: 'RISING',
    color: '#00E676',
    gradient: ['#001A08', '#002E12', '#001A08'],
    accent: '#00E676',
  };
}

// ----------------------------------------------------------------
// Helper: generate text summary for the native share sheet
// ----------------------------------------------------------------
export function generateShareText(type: ShareCardType, data: ShareCardData): string {
  switch (type) {
    case 'daily-summary': {
      const d = data as DailySummaryData;
      const pct: number = d.caloriesGoal
        ? Math.round(((d.caloriesConsumed ?? 0) / d.caloriesGoal) * 100)
        : 0;
      return [
        `FuelIQ Daily Summary`,
        `Calories: ${(d.caloriesConsumed ?? 0)?.toLocaleString()} / ${(d.caloriesGoal ?? 0)?.toLocaleString()} (${pct}%)`,
        `Protein: ${d.protein ?? 0}g | Carbs: ${d.carbs ?? 0}g | Fat: ${d.fat ?? 0}g`,
        d.streak ? `Streak: ${d.streak} days` : null,
        '',
        'Tracked with FuelIQ - AI Fitness',
      ]
        .filter(Boolean)
        .join('\n');
    }
    case 'streak': {
      const d = data as StreakData;
      return [
        `FuelIQ Streak: ${d.streak} Days`,
        getStreakQuote(d.streak),
        '',
        'Tracked with FuelIQ - AI Fitness',
      ].join('\n');
    }
    case 'workout-complete': {
      const d = data as WorkoutCompleteData;
      return [
        `Workout Complete: ${d.workoutName ?? 'Workout'}`,
        `Duration: ${d.duration ?? 0} min | Calories: ${d.caloriesBurned ?? 0}`,
        d.exerciseCount ? `Exercises: ${d.exerciseCount}` : null,
        '',
        'Powered by FuelIQ AI Trainer',
      ]
        .filter(Boolean)
        .join('\n');
    }
    case 'weight-milestone': {
      const d = data as WeightMilestoneData;
      return [
        `Weight Milestone: ${d.currentWeight ?? '?'} ${d.unit ?? 'lbs'}`,
        d.change ? `Change: ${d.change > 0 ? '+' : ''}${d.change} ${d.unit ?? 'lbs'}` : null,
        '',
        'Tracked with FuelIQ - AI Fitness',
      ]
        .filter(Boolean)
        .join('\n');
    }
    case 'achievement': {
      const d = data as AchievementData;
      return [
        `Achievement Unlocked!`,
        `${d.emoji ?? ''} ${d.title ?? 'Achievement'}`,
        d.description ?? '',
        '',
        'Earned on FuelIQ - AI Fitness',
      ]
        .filter(Boolean)
        .join('\n');
    }
    default:
      return 'Check out my progress on FuelIQ!';
  }
}

// ----------------------------------------------------------------
// Capture a ViewShot ref to a temp PNG and share via the native
// share sheet. Falls back to text-only sharing if capture fails.
// ----------------------------------------------------------------
export async function shareCard(viewRef: any, type: ShareCardType, data: ShareCardData): Promise<ShareResult> {
  try {
    // Attempt image capture
    const uri: string = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    const isAvailable: boolean = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing unavailable');
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Share your FuelIQ progress!',
    });

    return { success: true, method: 'image' };
  } catch {
    // Fallback: share as text
    try {
      const text: string = generateShareText(type, data);
      const isAvailable: boolean = await Sharing.isAvailableAsync();
      if (isAvailable) {
        // Write text to a temp file so we can use expo-sharing
        const tmpPath: string = `${FileSystem.cacheDirectory}fueliq-share.txt`;
        await FileSystem.writeAsStringAsync(tmpPath, text);
        await Sharing.shareAsync(tmpPath, {
          mimeType: 'text/plain',
          dialogTitle: 'Share your FuelIQ progress!',
        });
        return { success: true, method: 'text' };
      }
    } catch {
      // Total failure
    }
    return { success: false, method: 'none' };
  }
}

// ----------------------------------------------------------------
// Save the captured image to a known location (for "save" button)
// ----------------------------------------------------------------
export async function saveCardImage(viewRef: any): Promise<SaveResult> {
  try {
    const uri: string = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    const filename: string = `fueliq-card-${Date.now()}.png`;
    const dest: string = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: dest });

    return { success: true, uri: dest };
  } catch {
    return { success: false, uri: null };
  }
}

// ================================================================
//  ShareCardContent - the visual card rendered inside a ViewShot
// ================================================================

// --- Sub-components for each card type ---

interface BrandingHeaderProps {
  accentColor?: string;
}

function BrandingHeader({ accentColor }: BrandingHeaderProps): React.ReactElement {
  return (
    <View style={cardStyles.brandingHeader}>
      <View style={cardStyles.brandingLeft}>
        <Text style={[cardStyles.brandLogo, accentColor && { color: accentColor }]}>
          FuelIQ
        </Text>
        <Text style={cardStyles.brandSubtitle}>Powered by AI</Text>
      </View>
    </View>
  );
}

function BrandingFooter(): React.ReactElement {
  return (
    <View style={cardStyles.footer}>
      <View style={cardStyles.footerRule} />
      <Text style={cardStyles.footerText}>fueliq.app</Text>
    </View>
  );
}

// -- Macro bar used by daily-summary and workout cards --
interface MacroBarProps {
  label: string;
  value: number;
  goal: number;
  color: string;
}

function MacroBar({ label, value, goal, color }: MacroBarProps): React.ReactElement {
  const pct: number = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  return (
    <View style={cardStyles.macroBarContainer}>
      <View style={cardStyles.macroBarHeader}>
        <View style={[cardStyles.macroDot, { backgroundColor: color }]} />
        <Text style={cardStyles.macroBarLabel}>{label}</Text>
        <Text style={cardStyles.macroBarValue}>
          {value}g
          <Text style={cardStyles.macroBarGoal}> / {goal}g</Text>
        </Text>
      </View>
      <View style={cardStyles.macroTrack}>
        <LinearGradient
          colors={[color, color + 'AA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[cardStyles.macroFill, { width: `${pct}%` }]}
        />
      </View>
    </View>
  );
}

// --- Daily Summary Card ---
interface DailySummaryCardProps {
  data: DailySummaryData;
}

function DailySummaryCard({ data }: DailySummaryCardProps): React.ReactElement {
  const caloriesPct: number = data.caloriesGoal
    ? Math.round(((data.caloriesConsumed ?? 0) / data.caloriesGoal) * 100)
    : 0;
  const isOnTrack: boolean = (data.caloriesConsumed || 0) <= (data.caloriesGoal || 2000);
  const tier: StreakTier = getStreakTier(data.streak || 0);

  const dateStr: string = (data.date ?? new Date()).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <LinearGradient
      colors={['#0C0C14', '#101018', '#0A0A10']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={cardStyles.outerCard}
    >
      {/* Gradient border overlay */}
      <View style={cardStyles.borderOverlay}>
        <LinearGradient
          colors={['rgba(0,212,255,0.25)', 'rgba(255,107,53,0.15)', 'rgba(0,212,255,0.10)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Decorative glows */}
      <View style={[cardStyles.decorGlow, { top: -40, right: -40, backgroundColor: 'rgba(0,212,255,0.06)' }]} />
      <View style={[cardStyles.decorGlow, { bottom: -30, left: -30, backgroundColor: 'rgba(255,107,53,0.04)' }]} />

      <View style={cardStyles.innerCard}>
        <BrandingHeader accentColor={Colors.primary} />

        <Text style={cardStyles.dateLabel}>{dateStr}</Text>

        {/* Calories hero */}
        <View style={cardStyles.caloriesHero}>
          <Text style={cardStyles.caloriesNumber}>
            {(data.caloriesConsumed || 0).toLocaleString()}
          </Text>
          <Text style={cardStyles.caloriesUnit}>
            / {(data.caloriesGoal || 2000).toLocaleString()} cal
          </Text>
          {/* Progress bar */}
          <View style={cardStyles.caloriesProgressTrack}>
            <LinearGradient
              colors={isOnTrack ? ['#00E676', '#00C853'] : ['#FF5252', '#FF1744']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[cardStyles.caloriesProgressFill, { width: `${Math.min(caloriesPct, 100)}%` }]}
            />
          </View>
          <Text style={[cardStyles.caloriesStatus, { color: isOnTrack ? Colors.success : Colors.error }]}>
            {isOnTrack ? 'On Track' : 'Over Budget'} - {caloriesPct}%
          </Text>
        </View>

        {/* Macros */}
        <View style={cardStyles.macrosSection}>
          <MacroBar label="Protein" value={data.protein ?? 0} goal={data.proteinGoal ?? 150} color={Colors.protein} />
          <MacroBar label="Carbs" value={data.carbs ?? 0} goal={data.carbsGoal ?? 250} color={Colors.carbs} />
          <MacroBar label="Fat" value={data.fat ?? 0} goal={data.fatGoal ?? 65} color={Colors.fat} />
        </View>

        {/* Streak badge */}
        {(data.streak ?? 0) > 0 && (
          <View style={cardStyles.streakRow}>
            <LinearGradient
              colors={[tier.accent + '30', tier.accent + '10']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={cardStyles.streakPill}
            >
              <Text style={cardStyles.streakEmoji}>&#x1F525;</Text>
              <Text style={[cardStyles.streakPillText, { color: tier.accent }]}>
                {data.streak} day streak
              </Text>
            </LinearGradient>
          </View>
        )}

        <BrandingFooter />
      </View>
    </LinearGradient>
  );
}

// --- Streak Card ---
interface StreakCardProps {
  data: StreakData;
}

function StreakCard({ data }: StreakCardProps): React.ReactElement {
  const streak: number = data.streak || 0;
  const tier: StreakTier = getStreakTier(streak);
  const quote: string = getStreakQuote(streak);

  return (
    <LinearGradient
      colors={tier.gradient as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={cardStyles.outerCard}
    >
      <View style={[cardStyles.borderOverlay]}>
        <LinearGradient
          colors={[tier.accent + '40', tier.accent + '15', tier.accent + '05']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={[cardStyles.decorGlow, { top: -60, right: -60, backgroundColor: tier.accent + '0A' }]} />

      <View style={cardStyles.innerCard}>
        <BrandingHeader accentColor={tier.accent} />

        {/* Tier badge */}
        <View style={[cardStyles.tierBadge, { backgroundColor: tier.accent + '20' }]}>
          <Text style={[cardStyles.tierBadgeText, { color: tier.accent }]}>{tier.label}</Text>
        </View>

        {/* Big streak number */}
        <View style={cardStyles.streakHero}>
          <Text style={cardStyles.streakFireEmoji}>&#x1F525;</Text>
          <Text style={[cardStyles.streakBigNumber, { color: tier.accent }]}>
            {streak}
          </Text>
          <Text style={cardStyles.streakDaysLabel}>DAY STREAK</Text>
        </View>

        {/* Quote */}
        <View style={cardStyles.quoteContainer}>
          <Text style={cardStyles.quoteText}>"{quote}"</Text>
        </View>

        <BrandingFooter />
      </View>
    </LinearGradient>
  );
}

// --- Workout Complete Card ---
interface WorkoutCompleteCardProps {
  data: WorkoutCompleteData;
}

function WorkoutCompleteCard({ data }: WorkoutCompleteCardProps): React.ReactElement {
  return (
    <LinearGradient
      colors={['#0A0A14', '#0F1018', '#080810']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={cardStyles.outerCard}
    >
      <View style={cardStyles.borderOverlay}>
        <LinearGradient
          colors={['rgba(0,212,255,0.30)', 'rgba(0,212,255,0.10)', 'rgba(0,230,118,0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={[cardStyles.decorGlow, { top: -50, left: -50, backgroundColor: 'rgba(0,212,255,0.06)' }]} />

      <View style={cardStyles.innerCard}>
        <BrandingHeader accentColor={Colors.primary} />

        <Text style={cardStyles.workoutLabel}>WORKOUT COMPLETE</Text>
        <Text style={cardStyles.workoutName}>{data.workoutName || 'Custom Workout'}</Text>

        {/* Stats grid */}
        <View style={cardStyles.workoutGrid}>
          <View style={cardStyles.workoutStat}>
            <Text style={cardStyles.workoutStatValue}>{data.duration ?? 0}</Text>
            <Text style={cardStyles.workoutStatLabel}>MIN</Text>
          </View>
          <View style={[cardStyles.workoutStatDivider, { backgroundColor: Colors.border }]} />
          <View style={cardStyles.workoutStat}>
            <Text style={cardStyles.workoutStatValue}>{data.caloriesBurned ?? 0}</Text>
            <Text style={cardStyles.workoutStatLabel}>CAL</Text>
          </View>
          <View style={[cardStyles.workoutStatDivider, { backgroundColor: Colors.border }]} />
          <View style={cardStyles.workoutStat}>
            <Text style={cardStyles.workoutStatValue}>{data.exerciseCount ?? 0}</Text>
            <Text style={cardStyles.workoutStatLabel}>EXERCISES</Text>
          </View>
        </View>

        <BrandingFooter />
      </View>
    </LinearGradient>
  );
}

// --- Weight Milestone Card ---
interface WeightMilestoneCardProps {
  data: WeightMilestoneData;
}

function WeightMilestoneCard({ data }: WeightMilestoneCardProps): React.ReactElement {
  const changeColor: string = (data.change ?? 0) <= 0 ? Colors.success : Colors.secondary;

  return (
    <LinearGradient
      colors={['#0A100A', '#0E160E', '#080C08']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={cardStyles.outerCard}
    >
      <View style={cardStyles.borderOverlay}>
        <LinearGradient
          colors={['rgba(0,230,118,0.25)', 'rgba(0,230,118,0.08)', 'rgba(0,212,255,0.10)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={cardStyles.innerCard}>
        <BrandingHeader accentColor={Colors.success} />

        <Text style={cardStyles.milestoneLabel}>WEIGHT MILESTONE</Text>

        <View style={cardStyles.milestoneHero}>
          <Text style={cardStyles.milestoneEmoji}>&#x2696;&#xFE0F;</Text>
          <Text style={cardStyles.milestoneNumber}>
            {data.currentWeight ?? '?'}
          </Text>
          <Text style={cardStyles.milestoneUnit}>{data.unit ?? 'lbs'}</Text>
        </View>

        {data.change != null && (
          <View style={[cardStyles.changePill, { backgroundColor: changeColor + '20' }]}>
            <Text style={[cardStyles.changePillText, { color: changeColor }]}>
              {data.change > 0 ? '+' : ''}{data.change} {data.unit ?? 'lbs'}
            </Text>
          </View>
        )}

        <BrandingFooter />
      </View>
    </LinearGradient>
  );
}

// --- Achievement Card ---
interface AchievementCardProps {
  data: AchievementData;
}

function AchievementCard({ data }: AchievementCardProps): React.ReactElement {
  return (
    <LinearGradient
      colors={['#14100A', '#1A1408', '#100C06']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={cardStyles.outerCard}
    >
      <View style={cardStyles.borderOverlay}>
        <LinearGradient
          colors={['rgba(255,215,0,0.30)', 'rgba(255,215,0,0.10)', 'rgba(255,215,0,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={[cardStyles.decorGlow, { top: -50, left: '30%', backgroundColor: 'rgba(255,215,0,0.06)' }]} />

      <View style={cardStyles.innerCard}>
        <BrandingHeader accentColor={Colors.gold} />

        <Text style={cardStyles.achievementLabel}>ACHIEVEMENT UNLOCKED</Text>

        <View style={cardStyles.achievementHero}>
          <Text style={cardStyles.achievementEmoji}>{data.emoji ?? '&#x1F3C6;'}</Text>
          <Text style={cardStyles.achievementTitle}>{data.title ?? 'Achievement'}</Text>
          {data.description ? (
            <Text style={cardStyles.achievementDesc}>{data.description}</Text>
          ) : null}
        </View>

        <BrandingFooter />
      </View>
    </LinearGradient>
  );
}

// ----------------------------------------------------------------
//  Main exported component - renders the correct card type
// ----------------------------------------------------------------
interface ShareCardContentProps {
  type: ShareCardType;
  data: ShareCardData;
}

export function ShareCardContent({ type, data }: ShareCardContentProps): React.ReactElement {
  switch (type) {
    case 'daily-summary':
      return <DailySummaryCard data={data as DailySummaryData} />;
    case 'streak':
      return <StreakCard data={data as StreakData} />;
    case 'workout-complete':
      return <WorkoutCompleteCard data={data as WorkoutCompleteData} />;
    case 'weight-milestone':
      return <WeightMilestoneCard data={data as WeightMilestoneData} />;
    case 'achievement':
      return <AchievementCard data={data as AchievementData} />;
    default:
      return <DailySummaryCard data={data as DailySummaryData} />;
  }
}

// ================================================================
//  Styles for all card types
// ================================================================
const cardStyles = StyleSheet.create({
  // Outer card wrapper - gradient background
  outerCard: {
    width: SHARE_CARD_WIDTH,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },

  // 1px gradient border effect
  borderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
    zIndex: 1,
    // The gradient fill creates the visible border
    opacity: 1,
    // We achieve the gradient border by putting a gradient behind and
    // an inset card on top. Since RN doesn't support gradient borders
    // natively, the border overlay is purely decorative framing.
    pointerEvents: 'none',
  },

  // Decorative blurred glow circles
  decorGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    zIndex: 0,
  },

  // Inner content with padding
  innerCard: {
    padding: Spacing.lg,
    paddingVertical: Spacing.xl,
    zIndex: 2,
  },

  // --- Branding ---
  brandingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  brandingLeft: {
    gap: 2,
  },
  brandLogo: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // --- Footer ---
  footer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  footerRule: {
    width: '60%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: Spacing.sm,
  },
  footerText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // --- Date label ---
  dateLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    letterSpacing: 0.5,
  },

  // --- Daily Summary: Calories hero ---
  caloriesHero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  caloriesNumber: {
    fontSize: 52,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -2,
    lineHeight: 58,
  },
  caloriesUnit: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  caloriesProgressTrack: {
    width: '85%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  caloriesProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  caloriesStatus: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
  },

  // --- Macros section ---
  macrosSection: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  macroBarContainer: {
    gap: 4,
  },
  macroBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroBarLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  macroBarValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  macroBarGoal: {
    color: Colors.textTertiary,
    fontWeight: FontWeight.regular,
  },
  macroTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 3,
  },

  // --- Streak row (in daily summary) ---
  streakRow: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakPillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },

  // --- Streak card ---
  tierBadge: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  tierBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 2,
  },
  streakHero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  streakFireEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  streakBigNumber: {
    fontSize: 96,
    fontWeight: FontWeight.black,
    letterSpacing: -4,
    lineHeight: 100,
  },
  streakDaysLabel: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
  },
  quoteContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  quoteText: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },

  // --- Workout card ---
  workoutLabel: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  workoutName: {
    fontSize: FontSize.xl + 4,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    letterSpacing: -0.5,
  },
  workoutGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  workoutStat: {
    flex: 1,
    alignItems: 'center',
  },
  workoutStatValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    lineHeight: 38,
  },
  workoutStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  workoutStatDivider: {
    width: 1,
    height: 40,
  },

  // --- Weight milestone card ---
  milestoneLabel: {
    fontSize: FontSize.xs,
    color: Colors.success,
    letterSpacing: 3,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  milestoneHero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  milestoneEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  milestoneNumber: {
    fontSize: 72,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -3,
    lineHeight: 80,
  },
  milestoneUnit: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  changePill: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  changePillText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },

  // --- Achievement card ---
  achievementLabel: {
    fontSize: FontSize.xs,
    color: Colors.gold,
    letterSpacing: 3,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  achievementHero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  achievementEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  achievementTitle: {
    fontSize: FontSize.xl + 4,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: -0.3,
  },
  achievementDesc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
});
