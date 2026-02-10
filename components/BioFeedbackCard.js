import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Activity, Zap, Clock } from 'lucide-react-native';
import { hapticImpact } from '../lib/haptics';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { useMood, QUICK_MOODS } from '../context/MoodContext';
import MoodCheckInModal from './MoodCheckInModal';

function QuickMoodButton({ mood, emoji, label, onPress, isLast }) {
  const handlePress = async () => {
    await hapticImpact();
    onPress(mood);
  };

  return (
    <Pressable
      style={[styles.quickButton, isLast && styles.quickButtonLast]}
      onPress={handlePress}
    >
      <Text style={styles.quickEmoji}>{emoji}</Text>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

export default function BioFeedbackCard() {
  const { lastLog, lastLogRelativeTime, todaysAverage, quickLog } = useMood();
  const [modalVisible, setModalVisible] = useState(false);
  const [initialEnergy, setInitialEnergy] = useState(5);
  const [initialFocus, setInitialFocus] = useState(5);

  const handleQuickMood = async (moodType) => {
    // Set initial values based on quick mood
    const preset = QUICK_MOODS[moodType];
    if (preset) {
      setInitialEnergy(preset.energyLevel);
      setInitialFocus(preset.focusLevel);
    }
    // Open modal for full check-in
    setModalVisible(true);
  };

  const handleOpenModal = () => {
    setInitialEnergy(5);
    setInitialFocus(5);
    setModalVisible(true);
  };

  // Get the last mood emoji
  const getLastMoodEmoji = () => {
    if (!lastLog) return '❓';
    const avg = (lastLog.energyLevel + lastLog.focusLevel) / 2;
    if (avg <= 3) return '😔';
    if (avg <= 5) return '😐';
    if (avg <= 7) return '🙂';
    return '😄';
  };

  return (
    <>
      <View style={styles.card}>
        {/* Glass blur layer */}
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Activity size={18} color={Colors.accent} />
            </View>
            <Text style={styles.title}>Bio-Feedback</Text>
          </View>
          {lastLogRelativeTime && (
            <View style={styles.lastCheckIn}>
              <Clock size={12} color={Colors.textTertiary} />
              <Text style={styles.lastCheckInText}>{lastLogRelativeTime}</Text>
            </View>
          )}
        </View>

        {/* Question */}
        <Text style={styles.question}>How do you feel right now?</Text>

        {/* Quick Mood Buttons */}
        <View style={styles.quickButtons}>
          <QuickMoodButton
            mood="high"
            emoji="⚡"
            label="High Energy"
            onPress={handleQuickMood}
          />
          <QuickMoodButton
            mood="neutral"
            emoji="😐"
            label="Neutral"
            onPress={handleQuickMood}
          />
          <QuickMoodButton
            mood="tired"
            emoji="😴"
            label="Tired"
            onPress={handleQuickMood}
            isLast
          />
        </View>

        {/* Today's Stats (if available) */}
        {todaysAverage && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Zap size={14} color={Colors.warning} />
              <Text style={styles.statValue}>{todaysAverage.energy}</Text>
              <Text style={styles.statLabel}>Energy</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statEmoji}>{getLastMoodEmoji()}</Text>
              <Text style={styles.statValue}>{todaysAverage.logCount}</Text>
              <Text style={styles.statLabel}>Check-ins</Text>
            </View>
          </View>
        )}

        {/* Full Check-in Button */}
        <Pressable style={styles.fullButton} onPress={handleOpenModal}>
          <Text style={styles.fullButtonText}>Full Check-in</Text>
        </Pressable>
      </View>

      {/* Modal */}
      <MoodCheckInModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initialEnergy={initialEnergy}
        initialFocus={initialFocus}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  lastCheckIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  lastCheckInText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  question: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickButtonLast: {
    marginRight: 0,
  },
  quickEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  statEmoji: {
    fontSize: 16,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
  },
  fullButton: {
    backgroundColor: Colors.accent + '20',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  fullButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
});
