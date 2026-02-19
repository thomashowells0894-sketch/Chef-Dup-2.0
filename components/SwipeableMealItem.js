import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { hapticWarning } from '../lib/haptics';

const THRESHOLD = -80;
const MAX_TRANSLATE = -120;
const SPRING_CONFIG = { damping: 20, stiffness: 200 };

const SwipeableMealItem = React.memo(function SwipeableMealItem({ item, mealType, onRemove, children }) {
  const translateX = useSharedValue(0);
  const crossedThreshold = useSharedValue(false);

  const triggerHaptic = () => {
    hapticWarning();
  };

  const triggerRemove = () => {
    onRemove(item.id, mealType);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      const clampedX = Math.max(MAX_TRANSLATE, Math.min(0, e.translationX));
      translateX.value = clampedX;

      // Haptic when crossing threshold
      if (clampedX <= THRESHOLD && !crossedThreshold.value) {
        crossedThreshold.value = true;
        runOnJS(triggerHaptic)();
      } else if (clampedX > THRESHOLD && crossedThreshold.value) {
        crossedThreshold.value = false;
      }
    })
    .onEnd(() => {
      if (translateX.value <= THRESHOLD) {
        // Past threshold — remove with dissolve
        translateX.value = withSpring(MAX_TRANSLATE * 3, SPRING_CONFIG);
        runOnJS(triggerRemove)();
      } else {
        // Snap back
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
      crossedThreshold.value = false;
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Delete zone opacity tracks the gesture position
  const deleteZoneStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, THRESHOLD],
      [0, 1],
      { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP }
    );
    return { opacity };
  });

  // Red-to-transparent gradient overlay on the content row edge — follows swipe
  const swipeGradientStyle = useAnimatedStyle(() => {
    const intensity = interpolate(
      translateX.value,
      [0, THRESHOLD],
      [0, 0.25],
      { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP }
    );
    const bgColor = interpolateColor(
      translateX.value,
      [0, THRESHOLD / 2, THRESHOLD],
      ['rgba(255, 82, 82, 0)', 'rgba(255, 82, 82, 0.08)', 'rgba(255, 82, 82, 0.18)']
    );
    return {
      backgroundColor: bgColor,
      opacity: intensity > 0 ? 1 : 0,
    };
  });

  // Trash icon scales up as user swipes past threshold
  const trashIconStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translateX.value,
      [0, THRESHOLD / 2, THRESHOLD],
      [0.5, 0.8, 1.2],
      { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP }
    );
    return { transform: [{ scale }] };
  });

  return (
    <View style={styles.container}>
      {/* Red delete zone behind */}
      <ReAnimated.View
        style={[styles.deleteZone, deleteZoneStyle]}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.name}`}
        accessibilityHint="Swipe left to delete this food item"
      >
        <ReAnimated.View style={trashIconStyle}>
          <Trash2 size={20} color="#fff" />
        </ReAnimated.View>
        <Text style={styles.deleteText}>Delete</Text>
      </ReAnimated.View>

      {/* Swipeable content */}
      <GestureDetector gesture={pan}>
        <ReAnimated.View style={[styles.row, rowStyle]}>
          {children}
          {/* Red tint overlay that follows swipe gesture */}
          <ReAnimated.View style={[styles.swipeOverlay, swipeGradientStyle]} pointerEvents="none" />
        </ReAnimated.View>
      </GestureDetector>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.name === nextProps.item.name &&
    prevProps.mealType === nextProps.mealType
  );
});

export default SwipeableMealItem;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 120,
    backgroundColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  deleteText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
  row: {
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  swipeOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '40%',
  },
});
