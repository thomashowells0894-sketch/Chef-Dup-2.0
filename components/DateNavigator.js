import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react-native';
import { format, isToday } from 'date-fns';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { useDateNav } from '../context/MealContext';

export default function DateNavigator() {
  const {
    selectedDate,
    isPlanningMode,
    changeDate,
    goToToday,
    getDateLabel,
  } = useDateNav();

  // Animation for the label (Reanimated - UI thread)
  const labelScale = useSharedValue(1);
  const labelOpacity = useSharedValue(1);

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: labelScale.value }],
    opacity: labelOpacity.value,
  }));

  const animateChange = useCallback(() => {
    labelScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    labelOpacity.value = withSequence(
      withTiming(0.5, { duration: 100 }),
      withTiming(1, { duration: 150 })
    );
  }, []);

  const handlePrev = async () => {
    animateChange();
    await changeDate('prev');
  };

  const handleNext = async () => {
    animateChange();
    await changeDate('next');
  };

  const handleTodayPress = async () => {
    if (!isToday(selectedDate)) {
      animateChange();
      await goToToday();
    }
  };

  const dateLabel = getDateLabel(selectedDate);
  const fullDate = format(selectedDate, 'EEEE, MMMM d');
  const showTodayButton = !isToday(selectedDate);

  // Colors based on mode
  const accentColor = isPlanningMode ? '#5AC8FA' : Colors.primary;
  const modeLabel = isPlanningMode ? 'Planning Mode' : null;

  return (
    <View style={[styles.container, isPlanningMode && styles.containerPlanning]}>
      {/* Planning Mode Badge */}
      {isPlanningMode && (
        <View style={styles.planningBadge}>
          <Sparkles size={12} color="#5AC8FA" />
          <Text style={styles.planningBadgeText}>Planning Mode</Text>
        </View>
      )}

      <View style={styles.navigator}>
        {/* Previous Day Button */}
        <Pressable
          style={styles.arrowButton}
          onPress={handlePrev}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={Colors.text} />
        </Pressable>

        {/* Center Date Display */}
        <Pressable style={styles.centerContent} onPress={handleTodayPress}>
          <ReAnimated.View
            style={[styles.dateContainer, labelAnimatedStyle]}
          >
            <View style={[styles.dateIcon, { backgroundColor: accentColor + '20' }]}>
              <Calendar size={16} color={accentColor} />
            </View>
            <View style={styles.dateTextContainer}>
              <Text style={[styles.dateLabel, isPlanningMode && { color: accentColor }]}>
                {dateLabel}
              </Text>
              <Text style={styles.fullDate}>{fullDate}</Text>
            </View>
          </ReAnimated.View>
        </Pressable>

        {/* Next Day Button */}
        <Pressable
          style={styles.arrowButton}
          onPress={handleNext}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronRight size={24} color={Colors.text} />
        </Pressable>
      </View>

      {/* Today Button (when not on today) */}
      {showTodayButton && (
        <Pressable style={styles.todayButton} onPress={handleTodayPress}>
          <Text style={styles.todayButtonText}>Go to Today</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  containerPlanning: {
    backgroundColor: 'rgba(90, 200, 250, 0.08)',
    borderBottomColor: 'rgba(90, 200, 250, 0.2)',
  },
  planningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    marginBottom: Spacing.xs,
  },
  planningBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#5AC8FA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTextContainer: {
    alignItems: 'flex-start',
  },
  dateLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  fullDate: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  todayButton: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.full,
  },
  todayButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
