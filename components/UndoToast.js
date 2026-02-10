import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

const AUTO_DISMISS_MS = 3000;

export default function UndoToast({ visible, message, onUndo, onDismiss }) {
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  const handleUndo = () => {
    onUndo();
    onDismiss();
  };

  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutDown}
      style={styles.container}
    >
      <Text style={styles.message} numberOfLines={1}>
        {message}
      </Text>
      <Pressable onPress={handleUndo} hitSlop={8}>
        <Text style={styles.undoText}>Undo</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
  },
  message: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    marginRight: Spacing.md,
  },
  undoText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
