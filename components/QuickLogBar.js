import React, { memo, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Pin,
  PinOff,
  Trash2,
  ChevronRight,
  Zap,
  X,
} from 'lucide-react-native';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import useFrequentFoods from '../hooks/useFrequentFoods';

// Individual food chip in the horizontal scroll
const FoodChip = memo(function FoodChip({ food, onPress, onLongPress, index }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 8,
      tension: 400,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const truncatedName = food.name.length > 12
    ? food.name.substring(0, 11) + '...'
    : food.name;

  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 40).springify().mass(0.5).damping(12)}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          style={styles.chip}
          onPress={() => onPress(food)}
          onLongPress={() => onLongPress(food)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          delayLongPress={400}
          accessibilityRole="button"
          accessibilityLabel={`Quick add ${food.name}, ${food.calories} calories`}
          accessibilityHint="Tap to log this food, long press for options"
        >
          {food.pinned && <View style={styles.chipPinDot} />}
          <Text style={styles.chipEmoji}>{food.emoji || '?'}</Text>
          <Text style={styles.chipName} numberOfLines={1}>{truncatedName}</Text>
          <Text style={styles.chipCalories}>{food.calories}</Text>
        </Pressable>
      </Animated.View>
    </ReAnimated.View>
  );
});

// See All button at the end of the scroll
const SeeAllButton = memo(function SeeAllButton({ onPress }) {
  return (
    <Pressable style={styles.seeAllButton} onPress={onPress}>
      <Text style={styles.seeAllText}>See All</Text>
      <ChevronRight size={14} color={Colors.primary} />
    </Pressable>
  );
});

// Context menu modal for long-press actions
function ChipContextMenu({ visible, food, onClose, onTogglePin, onRemove }) {
  if (!food) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.contextOverlay} onPress={onClose}>
        <Pressable style={styles.contextCard} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.contextHeader}>
            <Text style={styles.contextEmoji}>{food.emoji || '?'}</Text>
            <View style={styles.contextHeaderInfo}>
              <Text style={styles.contextName}>{food.name}</Text>
              <Text style={styles.contextMeta}>
                {food.calories} kcal  ·  Logged {food.count || 0}x
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Actions */}
          <Pressable
            style={styles.contextAction}
            onPress={() => {
              onTogglePin(food.name);
              onClose();
            }}
          >
            {food.pinned ? (
              <>
                <PinOff size={18} color={Colors.warning} />
                <Text style={styles.contextActionText}>Unpin from Quick Log</Text>
              </>
            ) : (
              <>
                <Pin size={18} color={Colors.primary} />
                <Text style={styles.contextActionText}>Pin to Quick Log</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.contextAction, styles.contextActionDanger]}
            onPress={() => {
              onRemove(food.name);
              onClose();
            }}
          >
            <Trash2 size={18} color={Colors.error} />
            <Text style={[styles.contextActionText, { color: Colors.error }]}>
              Remove from Frequent Foods
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * QuickLogBar - Horizontal scrollable bar of frequent foods
 *
 * Props:
 *   onSelectFood(food) - called when a food chip is tapped
 *   mealType - current meal type for context
 */
export default function QuickLogBar({ onSelectFood, mealType }) {
  const router = useRouter();
  const { getTopFoods, pinnedFoods, togglePin, removeFood } = useFrequentFoods();
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextFood, setContextFood] = useState(null);

  // Combine pinned + top frequent, deduped, max 10
  const displayFoods = useMemo(() => {
    const top = getTopFoods(10);
    const seen = new Set();
    const result = [];

    // Pinned first
    for (const f of pinnedFoods) {
      if (!seen.has(f.name)) {
        seen.add(f.name);
        result.push(f);
      }
    }
    // Then top by count
    for (const f of top) {
      if (!seen.has(f.name)) {
        seen.add(f.name);
        result.push(f);
      }
    }

    return result.slice(0, 10);
  }, [getTopFoods, pinnedFoods]);

  const handleChipPress = useCallback((food) => {
    hapticLight();
    if (onSelectFood) {
      onSelectFood(food);
    }
  }, [onSelectFood]);

  const handleChipLongPress = useCallback((food) => {
    hapticLight();
    setContextFood(food);
    setContextMenuVisible(true);
  }, []);

  const handleSeeAll = useCallback(() => {
    hapticLight();
    router.push('/frequent-foods');
  }, [router]);

  const handleCloseContext = useCallback(() => {
    setContextMenuVisible(false);
    setContextFood(null);
  }, []);

  // Don't render if no frequent foods
  if (displayFoods.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} accessibilityRole="toolbar" accessibilityLabel="Quick log toolbar">
      {/* Section label */}
      <View style={styles.labelRow}>
        <Zap size={14} color={Colors.primary} />
        <Text style={styles.label}>Quick Log</Text>
      </View>

      {/* Horizontal scroll of chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {displayFoods.map((food, index) => (
          <FoodChip
            key={food.name}
            food={food}
            index={index}
            onPress={handleChipPress}
            onLongPress={handleChipLongPress}
          />
        ))}
        <SeeAllButton onPress={handleSeeAll} />
      </ScrollView>

      {/* Long-press context menu */}
      <ChipContextMenu
        visible={contextMenuVisible}
        food={contextFood}
        onClose={handleCloseContext}
        onTogglePin={togglePin}
        onRemove={removeFood}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    paddingLeft: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingRight: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  // Chip styles
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  chipPinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    position: 'absolute',
    top: -2,
    right: -2,
    zIndex: 1,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    maxWidth: 80,
  },
  chipCalories: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
  },
  // See All button
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    gap: 2,
  },
  seeAllText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  // Context menu
  contextOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  contextCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  contextEmoji: {
    fontSize: 32,
    marginRight: Spacing.sm,
  },
  contextHeaderInfo: {
    flex: 1,
  },
  contextName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  contextMeta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  contextAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  contextActionDanger: {
    borderTopColor: 'rgba(255,82,82,0.15)',
  },
  contextActionText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
});
